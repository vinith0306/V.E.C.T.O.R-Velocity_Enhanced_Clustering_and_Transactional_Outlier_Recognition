# V.E.C.T.O.R-BITCOIN: Technical Write-Up
## AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic

**System:** V.E.C.T.O.R (Velocity-Enhanced Clustering and Transactional Outlier Recognition)  
**Domain:** Bitcoin Transaction Intelligence for Law Enforcement  
**Platform:** Offline Linux (WSL Fedora) — No external API dependencies  

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        V.E.C.T.O.R SYSTEM                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Data Sources  │    │  Ingestion   │    │   Feature Engine     │   │
│  │              │───►│  Engine      │───►│                      │   │
│  │ CSV/JSON/XML │    │ bulk_ingest  │    │ 50+ behavioral       │   │
│  │ Bitcoin RPC  │    │ .py          │    │ features across      │   │
│  │ Redis Stream │    │              │    │ 9 groups             │   │
│  └──────────────┘    └──────────────┘    └───────┬──────────────┘   │
│                                                   │                  │
│  ┌──────────────┐    ┌──────────────┐    ┌───────▼──────────────┐   │
│  │ Transaction  │    │  Entity      │    │   ML Pipeline        │   │
│  │ Graph        │◄──►│  Profiler    │    │                      │   │
│  │ (NetworkX)   │    │ Common-Input │    │ UMAP → HDBSCAN →    │   │
│  │              │    │ Heuristic    │    │ IsolationForest +    │   │
│  │ PageRank,    │    │              │    │ XGBoost Fallback     │   │
│  │ Betweenness  │    └──────────────┘    └───────┬──────────────┘   │
│  └──────┬───────┘                                │                  │
│         │            ┌──────────────┐    ┌───────▼──────────────┐   │
│         │            │  IP-Wallet   │    │   Risk Engine        │   │
│         └───────────►│  Correlator  │───►│   Weighted Multi-    │   │
│                      │  GeoIP, Tor  │    │   Model Composite    │   │
│                      │  Detection   │    │   + Label Spreading  │   │
│                      └──────────────┘    └───────┬──────────────┘   │
│                                                   │                  │
│  ┌──────────────┐    ┌──────────────┐    ┌───────▼──────────────┐   │
│  │ MongoDB      │◄───│ Redis        │    │   Alert Generator    │   │
│  │ Persistence  │    │ Streams      │    │   Ranked + Explained │   │
│  └──────┬───────┘    └──────────────┘    └──────────────────────┘   │
│         │                                                            │
│  ┌──────▼───────────────────────────────────────────────────────┐   │
│  │              React + TypeScript Dashboard                     │   │
│  │  Overview ∙ Transactions ∙ Graph Explorer ∙ Risk Queue        │   │
│  │  Entity Profiles ∙ GeoIP Heatmap ∙ Investigation Manager     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Ingestion

### 2.1 Dataset Schema
The system ingests bulk metadata conforming to the following schema:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | datetime | Transaction relay time |
| `src_ip` / `dst_ip` | IPv4 | P2P relay source/destination |
| `src_port` / `dst_port` | int | Network ports (typically 8333) |
| `txid` | hex string | Transaction hash |
| `input_addresses[]` | string[] | Spending wallet addresses |
| `output_addresses[]` | string[] | Receiving wallet addresses |
| `input_amounts[]` / `output_amounts[]` | float[] | BTC values |
| `fee` | float | Transaction fee (BTC) |
| `input_count` / `output_count` | int | UTXO counts |
| `geo_country` | ISO 3166 | GeoIP country of relay node |
| `asn` | string | Autonomous System Number |

### 2.2 Supported Formats
- **CSV**: Semicolon-delimited list fields, DictReader parsing
- **JSON**: Flat array or `{"transactions": [...]}` envelope
- **XML**: `<transaction>` elements with nested `<item>` lists

### 2.3 Synthetic Dataset Generator
`generate_dataset.py` produces realistic synthetic data embedding:
- **Normal** transactions (55%): 1-in, 2-out standard transfers
- **Peel chains** (12%): Multi-hop asymmetric change splits
- **CoinJoin** (10%): Many inputs, many equal-value outputs
- **Fan-in** (8%): Consolidation to single output
- **Fan-out** (8%): Dispersion to many outputs
- **Rapid forwarding** (7%): Sub-minute pass-through

Each transaction includes bundled GeoIP data, with 3 entity archetypes (normal/suspicious/illicit) and Tor exit node simulation for illicit entities.

---

## 3. AI/ML Pipeline

### 3.1 Model Architecture Choice

| Component | Algorithm | Rationale |
|-----------|-----------|-----------|
| **Dimensionality Reduction** | UMAP | Preserves local + global structure; robust to noise; ideal for high-dimensional behavioral vectors |
| **Behavioral Clustering** | HDBSCAN | Density-based; automatically determines cluster count; handles arbitrary shapes; noise-tolerant |
| **Anomaly Detection** | Isolation Forest (per-cluster) | Efficient for high-dimensional data; does not assume distribution shape; interpretable anomaly score |
| **Fallback Classifier** | XGBoost | Handles cold-start entities outside any cluster; gradient boosting with strong generalization; outputs calibrated probabilities |

### 3.2 Feature Engineering (50+ Features)

Features are organized into **9 groups** computed by `BitcoinFeatureEngine`:

| Group | Count | Examples |
|-------|-------|---------|
| Transaction Structural | 8 | `input_count`, `output_count`, `fee_btc`, `total_output_btc`, `weight` |
| Script Type Indicators | 5 | `has_p2pkh`, `has_p2sh`, `has_p2wpkh`, `has_p2wsh`, `has_p2tr` |
| UTXO Lifecycle | 5 | `avg_utxo_age_blocks`, `young_utxo_spending_ratio`, `utxo_fragmentation` |
| Entity Behavioral | 6 | `entity_tx_count`, `entity_total_received_btc`, `entity_velocity_1h` |
| Graph Centrality | 6 | `pagerank`, `betweenness_centrality`, `degree`, `clustering_coefficient` |
| Motif/Pattern | 6 | `is_peel_chain`, `is_fan_in`, `is_fan_out`, `coinjoin_score`, `mixing_score` |
| Temporal | 4 | `hour_of_day`, `day_of_week`, `tx_rate_1h`, `inter_tx_gap_seconds` |
| Value Distribution | 5 | `output_value_entropy`, `max_output_ratio`, `change_output_ratio` |
| Network/IP | 5 | `ip_reuse_count`, `geo_diversity`, `tor_flag`, `vpn_flag`, `anonymity_score` |

### 3.3 Training Pipeline

```
Raw Transactions
      │
      ▼
┌─────────────┐
│  Feature     │  50+ canonical features per entity
│  Extraction  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  StandardScaler  │  Zero-mean, unit-variance normalization
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UMAP       │  n_components=8, min_dist=0.1, n_neighbors=15
│  Embedding  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  HDBSCAN    │  min_cluster_size=10, min_samples=5
│  Clustering │  → K behavioral communities
└──────┬──────┘
       │
       ├──────────────────────┐
       ▼                      ▼
┌─────────────┐        ┌─────────────┐
│ Per-Cluster  │        │  Global     │
│ Isolation    │        │  XGBoost    │
│ Forest       │        │  Fallback   │
│ (K models)   │        │  Classifier │
└──────────────┘        └─────────────┘
```

---

## 4. Detection Use Cases

### 4.1 Pattern Detection via Heuristic Rules

| Pattern | Detection Method | Rule Score Contribution |
|---------|-----------------|------------------------|
| **Peel Chain** | 1-in, 2-out with asymmetric split (small/large ratio < 0.15) | +35 |
| **CoinJoin** | ≥3 inputs, ≥3 equal-value outputs (equality ratio ≥ 0.4) | +30 to +40 |
| **Fan-In** | ≥5 inputs → ≤2 outputs (consolidation) | +25 |
| **Fan-Out** | ≤2 inputs → ≥8 outputs (dispersion) | +25 |
| **Rapid Forwarding** | Young UTXO spending ratio > 0.8 | +30 |
| **Dormant Awakening** | UTXO age > 1000 blocks spent suddenly | +20 |
| **Tor Exit Node** | Source IP matches known Tor prefix | +20 |
| **VPN/Hosting** | ASN matches known VPN provider | +10 |

### 4.2 CoinJoin Detection Algorithm
```
For transaction T with inputs I[] and outputs O[]:
  1. Filter out OP_RETURN outputs
  2. Round output values to 4 decimal places
  3. Count frequency of each output value
  4. max_equal = max(frequency of any single value)
  5. equal_ratio = max_equal / |O|
  6. IF max_equal ≥ 3 AND equal_ratio ≥ 0.4:
       → Flag as CoinJoin
       → coinjoin_score = min(1.0, equal_ratio × max_equal / 5)
```

### 4.3 Risk Propagation (Label Spreading)

Risk flows from **seed illicit entities** through the transaction graph:

```
risk(v) = max(risk(v), α × max(risk(neighbors)))
```

Where `α = 0.65` (decay factor per hop). This means:
- Hop 0 (seed): risk = 1.00
- Hop 1: risk ≤ 0.65
- Hop 2: risk ≤ 0.42
- Hop 3: risk ≤ 0.27

Propagation terminates when `max_change < 0.001` or after 10 iterations.

---

## 5. Multi-Model Risk Scoring

The **BitcoinRiskEngine** synthesizes four independent signals into a composite risk score:

```
final_risk = w₁ × ML_score + w₂ × Rule_score + w₃ × Graph_score + w₄ × Propagation_score
```

| Component | Weight | Source |
|-----------|--------|--------|
| ML Score | 0.40 | Isolation Forest / XGBoost anomaly probability |
| Rule Score | 0.30 | Heuristic pattern detection (0-100) |
| Graph Score | 0.15 | PageRank + betweenness centrality anomaly |
| Propagation Score | 0.15 | Label Spreading from seed illicit entities |

### Risk Level Classification

| Score Range | Level | Action |
|-------------|-------|--------|
| 75–100 | CRITICAL | Immediate investigation, auto-escalate |
| 50–74 | HIGH | Priority review, queue for analyst |
| 25–49 | MEDIUM | Monitoring, periodic review |
| 0–24 | LOW | Standard baseline, no action |

---

## 6. Explainability Method

V.E.C.T.O.R provides **signal-level decomposition** for every risk assessment:

### 6.1 Signal Decomposition
Each detection signal is named and scored independently:
```json
{
  "signals": ["peel_chain_pattern", "rapid_forwarding", "tor_exit_node"],
  "risk_components": {
    "ml_contribution": 34.2,
    "rule_contribution": 28.5,
    "graph_contribution": 8.1,
    "propagation_contribution": 12.0
  }
}
```

### 6.2 Natural Language Explanation
The risk engine generates human-readable explanations:

> *"This transaction exhibits peel-chain structural movement (asymmetric 85:15 split) with rapid forwarding (UTXO age < 10 blocks). The entity's PageRank (0.012) is 6.7× the network median, suggesting hub-like concentration. Risk was propagated through 2 hops from seed illicit entity ENT_A1B2C3."*

### 6.3 Risk Propagation Path
For propagated risk, the system provides the exact path:
```
Seed: ENT_ILLICIT_001 → TX:abc123 → Addr:bc1q... → TX:def456 → Target Entity
```

---

## 7. IP-Wallet Correlation

The **IPWalletCorrelator** module bridges network-layer and blockchain-layer observations:

| Feature | Description |
|---------|-------------|
| IP Reuse Count | How many wallets used the same relay IP |
| Geo Diversity | Number of distinct countries per entity |
| Tor Detection | Prefix-based detection of Tor exit nodes |
| VPN Detection | ASN-based detection of hosting/VPN providers |
| Cross-Entity IP Links | Entities sharing relay infrastructure |
| Burst Score | High-frequency transactions from single IP |
| Anonymity Score | Composite (Tor + VPN) / total IPs |

---

## 8. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| ML/Data | Python, NumPy, scikit-learn, XGBoost, UMAP, HDBSCAN | 3.11+ |
| Graph | NetworkX | 3.x |
| Persistence | MongoDB | 6.0+ |
| Streaming | Redis Streams | 7.0+ |
| Backend API | Express.js, Socket.io | 4.x |
| Frontend | React 18, TypeScript 5, Chart.js, TailwindCSS | Latest |
| Platform | Linux (WSL Fedora 44), fully offline | - |

---

## 9. Deployment

The system is fully offline and deploys with two scripts:

1. **`setup_fedora.sh`** — Installs MongoDB, Redis, Python 3.11+, Node.js 18+, creates virtual environment, installs all dependencies.
2. **`run.sh`** — Starts all services, generates synthetic dataset, trains ML models, seeds database, launches backend and frontend.

Access at `http://localhost:5173` after running `./run.sh`.

---

*Document prepared for the National Technical Research Organisation (NTRO) problem statement on AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic.*
