import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Layers, 
  ShieldAlert, 
  CheckCircle,
  Coins,
  ArrowRight
} from 'lucide-react';
import { useBitcoin } from '../../context/BitcoinContext';
import { GraphNode, GraphEdge } from '../../types/bitcoin';

interface Props {
  initialNodeId?: string | null;
}

const BitcoinTransactionGraph: React.FC<Props> = ({ initialNodeId }) => {
  const { graphData, fetchGraph, transactions, entities } = useBitcoin();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [targetId, setTargetId] = useState(initialNodeId || entities[0]?.entity_id || 'ENT_BTC_001');

  useEffect(() => {
    if (targetId) {
      fetchGraph(targetId);
    }
  }, [targetId]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="space-y-4">
      {/* Graph Control Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Interactive Transaction & Entity Graph</h2>
            <p className="text-xs text-gray-500">Multi-hop UTXO flow tracing and structural centrality analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Enter Address, TXID or Entity..."
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => fetchGraph(targetId)}
            className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Trace
          </button>
        </div>
      </div>

      {/* Graph Display Canvas + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-3 bg-gray-900 rounded-2xl p-6 min-h-[540px] border border-gray-800 relative flex flex-col justify-between overflow-hidden shadow-inner">
          {/* Legend Overlay */}
          <div className="flex flex-wrap items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-[11px] text-gray-300 z-10 w-fit">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Address Node</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500"></span> Transaction Node</span>
            <span className="text-gray-500">|</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low Risk</span>
          </div>

          {/* Force Graph Nodes Simulation Mock Visualizer */}
          <div className="my-auto py-12 flex flex-wrap justify-center items-center gap-8 relative z-0">
            {graphData.nodes.length === 0 ? (
              <div className="text-center text-gray-500">
                <Share2 className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                <p className="text-xs">No graph elements to display for this node query.</p>
              </div>
            ) : (
              graphData.nodes.map((node, i) => {
                const isSelected = selectedNode?.id === node.id;
                const isTx = node.type === 'transaction';
                const isHigh = node.risk_score && node.risk_score >= 50;

                return (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={`p-3 rounded-xl transition-all duration-200 text-left border flex flex-col gap-1 shadow-lg transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-amber-400 scale-110 z-20' : ''
                    } ${
                      isTx 
                        ? 'bg-amber-950/80 border-amber-600 text-amber-200' 
                        : (isHigh ? 'bg-red-950/80 border-red-500 text-red-200' : 'bg-gray-800 border-gray-700 text-gray-200')
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-bold tracking-wider opacity-80">
                      <span>{node.type}</span>
                      {node.risk_score ? <span>{node.risk_score} pts</span> : null}
                    </div>
                    <div className="font-mono text-xs font-bold truncate max-w-[120px]">{node.label}</div>
                    {node.value_btc ? (
                      <div className="text-[10px] text-emerald-400 font-mono">₿ {node.value_btc.toFixed(4)}</div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Graph Status Footer */}
          <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-800 pt-3 z-10">
            <span>Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}</span>
            <span className="font-mono text-[11px] text-amber-400">Centering: {targetId}</span>
          </div>
        </div>

        {/* Selected Node Details Inspector */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
            Node Inspector
          </h3>

          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-400 block">Identifier</span>
                <span className="text-xs font-mono font-bold text-gray-900 break-all">{selectedNode.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Node Type</span>
                  <span className="text-xs font-bold text-gray-900 uppercase">{selectedNode.type}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-[11px] text-gray-500 block">Risk Score</span>
                  <span className="text-xs font-bold text-danger-600">{selectedNode.risk_score || 10} / 100</span>
                </div>
              </div>
              <button
                onClick={() => setTargetId(selectedNode.id)}
                className="w-full py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                Expand 1-Hop Neighbors <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-8 text-center">Click any node in the graph to inspect connections and metadata.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BitcoinTransactionGraph;
