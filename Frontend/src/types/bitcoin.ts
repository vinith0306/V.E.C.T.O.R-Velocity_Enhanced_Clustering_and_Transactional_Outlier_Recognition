export interface BitcoinInput {
  vin_index: number;
  prev_txid: string;
  prev_vout: number;
  value_btc: number;
  script_type: string;
  address?: string;
  is_coinbase?: boolean;
}

export interface BitcoinOutput {
  vout: number;
  value_btc: number;
  script_type: string;
  address?: string;
  is_op_return?: boolean;
}

export interface BitcoinTransaction {
  _id?: string;
  txid: string;
  block_height: number;
  block_hash: string;
  timestamp: number;
  date: string;
  time: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  entity_id: string;
  input_count: number;
  output_count: number;
  total_input_btc: number;
  total_output_btc: number;
  fee_btc: number;
  inputs: BitcoinInput[];
  outputs: BitcoinOutput[];
  input_addresses: string[];
  output_addresses: string[];
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: string[];
  explanation: string;
  cluster_id: number;
  status: string;
}

export interface BitcoinBlock {
  _id?: string;
  height: number;
  hash: string;
  time: number;
  timestamp: string;
  tx_count: number;
  size: number;
  difficulty: number;
  status: string;
}

export interface BitcoinEntity {
  _id?: string;
  entity_id: string;
  label: string;
  primary_address: string;
  addresses: string[];
  first_seen: string;
  last_seen: string;
  tx_count: number;
  total_received_btc: number;
  total_sent_btc: number;
  balance_btc: number;
  velocity_1h: number;
  velocity_24h: number;
  unique_counterparties: number;
  cluster_id: number;
  cluster_description: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pagerank: number;
}

export interface BitcoinRiskLead {
  _id?: string;
  lead_id: string;
  txid: string;
  entity_id: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: string[];
  explanation: string;
  timestamp: number;
  created_at: string;
}

export interface BitcoinInvestigation {
  _id?: string;
  investigation_id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  risk_score: number;
  created_by: string;
  created_at: string;
  entities: string[];
  transactions: string[];
  notes: string;
}

export interface BitcoinClusterInfo {
  cluster_id: number;
  name: string;
  description: string;
  entity_count: number;
  avg_volume_btc: number;
  avg_velocity_1h: number;
  anomaly_rate_pct: number;
}

export interface BitcoinStatus {
  current_block_height: number;
  total_blocks_processed: number;
  total_transactions: number;
  total_entities: number;
  total_btc_monitored: number;
  critical_leads_count: number;
  high_leads_count: number;
  network: string;
  node_status: string;
  model_status: string;
  tps: number;
  model_latency_ms: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'address' | 'transaction' | 'entity';
  value_btc?: number;
  risk_score?: number;
  risk_level?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
  value_btc?: number;
}
