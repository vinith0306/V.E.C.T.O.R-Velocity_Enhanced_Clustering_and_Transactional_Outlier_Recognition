import React from 'react';
import { 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle, 
  Coins, 
  Layers, 
  Clock, 
  Cpu, 
  FileText, 
  ExternalLink,
  GitCommit,
  Tag
} from 'lucide-react';
import { useBitcoin } from '../../context/BitcoinContext';
import { BitcoinTransaction } from '../../types/bitcoin';

interface Props {
  transaction?: BitcoinTransaction | null;
  onOpenGraph?: (txid: string) => void;
}

const BitcoinTransactionExplorer: React.FC<Props> = ({ transaction, onOpenGraph }) => {
  const { selectedTx, transactions } = useBitcoin();
  const tx = transaction || selectedTx || transactions[0];

  if (!tx) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
        <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700">No Transaction Selected</h3>
        <p className="text-xs text-gray-500 mt-1">Select a transaction from the Live Feed to inspect its UTXO structure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transaction Header Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Bitcoin Transaction
              </span>
              <span className="text-xs font-mono text-gray-500">Block #{tx.block_height}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" /> {tx.date} {tx.time}
              </span>
            </div>
            <h2 className="text-lg font-mono font-bold text-gray-900 break-all">{tx.txid}</h2>
          </div>

          <div className="flex items-center gap-3">
            {onOpenGraph && (
              <button
                onClick={() => onOpenGraph(tx.txid)}
                className="inline-flex items-center text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-2 rounded-lg hover:bg-primary-100 border border-primary-200 transition-colors"
              >
                <GitCommit className="w-4 h-4 mr-1.5" /> View in Graph
              </button>
            )}
            <div className={`px-4 py-2 rounded-lg border text-right ${
              tx.risk_level === 'CRITICAL' ? 'bg-danger-50 border-danger-200 text-danger-800' :
              tx.risk_level === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
              tx.risk_level === 'MEDIUM' ? 'bg-warning-50 border-warning-200 text-warning-800' :
              'bg-success-50 border-success-200 text-success-800'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider">Risk Score</div>
              <div className="text-lg font-extrabold">{tx.risk_score} / 100 ({tx.risk_level})</div>
            </div>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
          <div>
            <span className="text-xs text-gray-500 block">Total Transferred</span>
            <span className="text-sm font-mono font-bold text-gray-900">₿ {tx.total_output_btc.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Transaction Fee</span>
            <span className="text-sm font-mono font-semibold text-gray-900">₿ {tx.fee_btc.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Entity Cluster</span>
            <span className="text-xs font-mono font-semibold text-indigo-700">{tx.entity_id}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Size / Weight</span>
            <span className="text-xs font-mono text-gray-700">{tx.size} B ({tx.weight} WU)</span>
          </div>
        </div>
      </div>

      {/* UTXO Inputs & Outputs Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs (Spent UTXOs) */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Inputs (Consumed UTXOs)</span>
            <span className="text-xs font-mono text-gray-500">{tx.inputs?.length || 0} inputs</span>
          </h3>
          <div className="space-y-3">
            {tx.inputs?.map((inp, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200/60 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-gray-700 truncate max-w-[200px]" title={inp.address || 'Coinbase'}>
                    {inp.address || 'Coinbase Generation'}
                  </span>
                  <span className="font-mono font-bold text-gray-900">₿ {inp.value_btc.toFixed(6)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Script: <span className="font-semibold text-gray-700">{inp.script_type}</span></span>
                  <span className="font-mono truncate max-w-[150px]">Prev: {inp.prev_txid?.slice(0, 8)}...#{inp.prev_vout}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs (Created UTXOs) */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Outputs (Created UTXOs)</span>
            <span className="text-xs font-mono text-gray-500">{tx.outputs?.length || 0} outputs</span>
          </h3>
          <div className="space-y-3">
            {tx.outputs?.map((out, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200/60 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-gray-700 truncate max-w-[200px]" title={out.address || 'OP_RETURN'}>
                    {out.address || (out.is_op_return ? 'OP_RETURN (Null Data)' : 'Unknown')}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">₿ {out.value_btc.toFixed(6)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Script: <span className="font-semibold text-gray-700">{out.script_type}</span></span>
                  <span className="text-xs">Vout #{out.vout}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Evidence & Signal Explanation */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-500" />
          V.E.C.T.O.R Investigative Evidence & Explanations
        </h3>
        
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-gray-800 leading-relaxed mb-4">
          <strong>Analyst Summary:</strong> {tx.explanation}
        </div>

        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Detected Pattern Signals:</span>
          <div className="flex flex-wrap gap-2">
            {tx.signals && tx.signals.length > 0 ? (
              tx.signals.map((sig, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  <Tag className="w-3 h-3 mr-1.5 text-amber-600" /> {sig.replace(/_/g, ' ')}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">Standard behavioral parameters (No anomalies detected)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinTransactionExplorer;
