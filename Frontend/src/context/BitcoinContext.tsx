import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import {
  BitcoinTransaction,
  BitcoinBlock,
  BitcoinEntity,
  BitcoinRiskLead,
  BitcoinInvestigation,
  BitcoinClusterInfo,
  BitcoinStatus,
  GraphNode,
  GraphEdge
} from '../types/bitcoin';

const API_BASE = 'http://localhost:3001/api/bitcoin';

interface BitcoinContextType {
  status: BitcoinStatus | null;
  transactions: BitcoinTransaction[];
  blocks: BitcoinBlock[];
  entities: BitcoinEntity[];
  riskQueue: BitcoinRiskLead[];
  clusters: BitcoinClusterInfo[];
  investigations: BitcoinInvestigation[];
  selectedTx: BitcoinTransaction | null;
  setSelectedTx: (tx: BitcoinTransaction | null) => void;
  selectedEntity: BitcoinEntity | null;
  setSelectedEntity: (entity: BitcoinEntity | null) => void;
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
  fetchGraph: (nodeId: string) => Promise<void>;
  createInvestigation: (data: Partial<BitcoinInvestigation>) => Promise<void>;
  refreshAll: () => Promise<void>;
  isLoading: boolean;
}

const defaultStatus: BitcoinStatus = {
  current_block_height: 840250,
  total_blocks_processed: 0,
  total_transactions: 0,
  total_entities: 0,
  total_btc_monitored: 0,
  critical_leads_count: 0,
  high_leads_count: 0,
  network: 'regtest',
  node_status: 'connected',
  model_status: 'operational',
  tps: 0,
  model_latency_ms: 0
};

const BitcoinContext = createContext<BitcoinContextType>({
  status: defaultStatus,
  transactions: [],
  blocks: [],
  entities: [],
  riskQueue: [],
  clusters: [],
  investigations: [],
  selectedTx: null,
  setSelectedTx: () => {},
  selectedEntity: null,
  setSelectedEntity: () => {},
  graphData: { nodes: [], edges: [] },
  fetchGraph: async () => {},
  createInvestigation: async () => {},
  refreshAll: async () => {},
  isLoading: true
});

export const useBitcoin = () => useContext(BitcoinContext);

export const BitcoinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BitcoinStatus | null>(defaultStatus);
  const [transactions, setTransactions] = useState<BitcoinTransaction[]>([]);
  const [blocks, setBlocks] = useState<BitcoinBlock[]>([]);
  const [entities, setEntities] = useState<BitcoinEntity[]>([]);
  const [riskQueue, setRiskQueue] = useState<BitcoinRiskLead[]>([]);
  const [clusters, setClusters] = useState<BitcoinClusterInfo[]>([]);
  const [investigations, setInvestigations] = useState<BitcoinInvestigation[]>([]);
  const [selectedTx, setSelectedTx] = useState<BitcoinTransaction | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<BitcoinEntity | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = async () => {
    try {
      const [resStatus, resTxs, resBlocks, resEntities, resRisk, resClusters, resInvs] = await Promise.all([
        axios.get(`${API_BASE}/status`).catch(() => ({ data: defaultStatus })),
        axios.get(`${API_BASE}/transactions?limit=60`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/blocks`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/entities`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/risk-queue`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/clusters`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/investigations`).catch(() => ({ data: [] }))
      ]);

      setStatus(resStatus.data);
      setTransactions(resTxs.data);
      setBlocks(resBlocks.data);
      setEntities(resEntities.data);
      setRiskQueue(resRisk.data);
      setClusters(resClusters.data);
      setInvestigations(resInvs.data);

      if (resTxs.data.length > 0 && !selectedTx) {
        setSelectedTx(resTxs.data[0]);
      }
      if (resEntities.data.length > 0 && !selectedEntity) {
        setSelectedEntity(resEntities.data[0]);
      }
      setIsLoading(false);
    } catch (e) {
      console.error('Error fetching Bitcoin data:', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();

    // Socket.io real-time updates
    const handleNewTx = (tx: BitcoinTransaction) => {
      setTransactions(prev => [tx, ...prev.slice(0, 79)]);
    };

    const handleNewBlock = (block: BitcoinBlock) => {
      setBlocks(prev => [block, ...prev.slice(0, 19)]);
    };

    const handleNewRisk = (lead: BitcoinRiskLead) => {
      setRiskQueue(prev => [lead, ...prev]);
    };

    socket.on('bitcoin:newTransaction', handleNewTx);
    socket.on('bitcoin:newBlock', handleNewBlock);
    socket.on('bitcoin:newRiskEvent', handleNewRisk);

    return () => {
      socket.off('bitcoin:newTransaction', handleNewTx);
      socket.off('bitcoin:newBlock', handleNewBlock);
      socket.off('bitcoin:newRiskEvent', handleNewRisk);
    };
  }, []);

  const fetchGraph = async (nodeId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/graph/${nodeId}`);
      setGraphData(res.data);
    } catch (e) {
      console.error('Error loading graph:', e);
    }
  };

  const createInvestigation = async (data: Partial<BitcoinInvestigation>) => {
    try {
      const res = await axios.post(`${API_BASE}/investigations`, data);
      setInvestigations(prev => [res.data, ...prev]);
    } catch (e) {
      console.error('Failed to create investigation:', e);
    }
  };

  return (
    <BitcoinContext.Provider
      value={{
        status,
        transactions,
        blocks,
        entities,
        riskQueue,
        clusters,
        investigations,
        selectedTx,
        setSelectedTx,
        selectedEntity,
        setSelectedEntity,
        graphData,
        fetchGraph,
        createInvestigation,
        refreshAll,
        isLoading
      }}
    >
      {children}
    </BitcoinContext.Provider>
  );
};
