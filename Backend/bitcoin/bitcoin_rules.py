"""
Bitcoin Behavioral Heuristics & Pattern Detection
Implements probabilistic heuristics (Peel Chains, Rapid Forwarding, Fan-In/Fan-Out,
Dormant Awakening, Change Output) without claiming deterministic identity proof.
"""

from typing import Dict, Any, List, Optional
import time

class BitcoinRulesEngine:
    @staticmethod
    def evaluate_heuristics(
        tx: Dict[str, Any],
        entity_history: Optional[List[Dict[str, Any]]] = None,
        utxo_stats: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate heuristic rules and compute rule confidence scores.
        """
        signals = []
        rule_score = 0.0

        in_count = tx.get("input_count", 1)
        out_count = tx.get("output_count", 1)
        total_btc = tx.get("total_output_btc", 0.0)

        # 1. Peel Chain Detection (Large input -> One main output + One small change output)
        is_peel_chain = False
        if in_count == 1 and out_count == 2:
            outs = tx.get("outputs", [])
            val0, val1 = outs[0].get("value_btc", 0.0), outs[1].get("value_btc", 0.0)
            ratio = min(val0, val1) / max(0.0001, max(val0, val1))
            if ratio < 0.15 and max(val0, val1) > 0.5:
                is_peel_chain = True
                signals.append("peel_chain_pattern")
                rule_score += 35.0

        # 2. Fan-In (Consolidation: many inputs -> 1 or 2 outputs)
        if in_count >= 5 and out_count <= 2:
            signals.append("fan_in_consolidation")
            rule_score += 25.0

        # 3. Fan-Out (Distribution: 1 or 2 inputs -> many outputs)
        if in_count <= 2 and out_count >= 8:
            signals.append("fan_out_dispersion")
            rule_score += 25.0

        # 4. Rapid Forwarding (Short inter-transaction pass-through)
        if utxo_stats and utxo_stats.get("young_utxo_spending_ratio", 0) > 0.8:
            signals.append("rapid_forwarding")
            rule_score += 30.0

        # 5. Dormant-to-Active Awakening (Spending UTXOs older than 1000 blocks / ~7 days)
        if utxo_stats and utxo_stats.get("avg_utxo_age_blocks", 0) > 1000:
            signals.append("dormant_utxo_awakening")
            rule_score += 20.0

        # 6. High Value Anomaly
        if total_btc >= 10.0:
            signals.append("high_value_transfer")
            rule_score += 15.0

        # 7. Common-Input Heuristic Flag
        if in_count >= 2:
            signals.append("common_input_relationship")

        # Clamp rule score to [0, 100]
        rule_score = min(100.0, rule_score)

        return {
            "rule_score": round(rule_score, 2),
            "signals": signals,
            "is_peel_chain": is_peel_chain
        }
