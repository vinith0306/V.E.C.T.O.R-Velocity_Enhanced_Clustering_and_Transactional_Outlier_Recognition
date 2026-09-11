import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Coins, 
  Activity, 
  Share2, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useBitcoin } from '../../context/BitcoinContext';
import { BitcoinEntity, BitcoinTransaction } from '../../types/bitcoin';

interface Props {
  onSelectTx: (tx: BitcoinTransaction) => void;
  onOpenGraph: (id: string) => void;
}

const BitcoinAddressEntityExplorer: React.FC<Props> = ({ onSelectTx, onOpenGraph }) => {
  const { entities, transactions, selectedEntity, setSelectedEntity } = useBitcoin();
  const [searchTerm, setSearchTerm] = useState('');

  const entity = selectedEntity || entities[0];

  const filteredEntities = entities.filter(e => 
    e.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.primary_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.addresses.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const entityTxs = transactions.filter(t => t.entity_id === entity?.entity_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Entity Selector Sidebar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Behavioral Entities
          </h3>
          <span className="text-xs text-gray-500 font-mono">{entities.length} entities</span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search address or entity..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {filteredEntities.map(e => (
            <button
              key={e.entity_id}
              onClick={() => setSelectedEntity(e)}
              className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                entity?.entity_id === e.entity_id
                  ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono font-bold text-gray-900">{e.entity_id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  e.risk_level === 'CRITICAL' ? 'bg-danger-100 text-danger-800' :
                  e.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  e.risk_level === 'MEDIUM' ? 'bg-warning-100 text-warning-800' :
                  'bg-success-100 text-success-800'
                }`}>
                  Risk: {e.risk_score}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 truncate font-mono">{e.primary_address}</div>
              <div className="flex justify-between text-[11px] text-gray-600 mt-2 pt-1.5 border-t border-gray-200/50">
                <span>{e.tx_count} txs</span>
                <span className="font-semibold">₿ {e.total_received_btc.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Entity Profile & Associated Transactions */}
      <div className="lg:col-span-2 space-y-6">
        {entity ? (
          <>
            {/* Entity Header */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Behavioral Cluster Entity
                    </span>
                    <span className="text-xs text-gray-500">Cluster #{entity.cluster_id}</span>
                  </div>
                  <h2 className="text-xl font-mono font-bold text-gray-900">{entity.entity_id}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-lg">
                    Primary: {entity.primary_address}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenGraph(entity.entity_id)}
                    className="inline-flex items-center text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-2 rounded-lg hover:bg-primary-100 border border-primary-200"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> Graph Neighbors
                  </button>
                  <div className={`px-4 py-2 rounded-lg border text-right ${
                    entity.risk_level === 'CRITICAL' ? 'bg-danger-50 border-danger-200 text-danger-800' :
                    entity.risk_level === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    entity.risk_level === 'MEDIUM' ? 'bg-warning-50 border-warning-200 text-warning-800' :
                    'bg-success-50 border-success-200 text-success-800'
                  }`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider">Risk Score</div>
                    <div className="text-lg font-bold">{entity.risk_score} / 100</div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl mb-4">
                <div>
                  <span className="text-xs text-gray-500 block">Total Inflow</span>
                  <span className="text-sm font-mono font-bold text-gray-900">₿ {entity.total_received_btc.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">1-Hour Velocity</span>
                  <span className="text-sm font-mono font-bold text-amber-600">{entity.velocity_1h} tx/hr</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Unique Counterparties</span>
                  <span className="text-sm font-mono font-bold text-gray-900">{entity.unique_counterparties} addresses</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">PageRank Score</span>
                  <span className="text-sm font-mono font-bold text-gray-900">{entity.pagerank?.toFixed(5) || '0.0018'}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <strong>Behavioral Profile:</strong> {entity.cluster_description}
              </div>
            </div>

            {/* Linked Addresses */}
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Associated Addresses in Entity Clustered via Common-Inputs ({entity.addresses?.length || 1})
              </h3>
              <div className="space-y-2">
                {entity.addresses?.map((addr, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs font-mono text-gray-800 border border-gray-200/50">
                    <span className="truncate">{addr}</span>
                    <span className="text-[11px] text-gray-400 font-sans ml-2">Linked Address #{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History for Entity */}
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Recent Entity Transactions ({entityTxs.length})
              </h3>
              <div className="space-y-2">
                {entityTxs.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No transactions recorded for this entity.</p>
                ) : (
                  entityTxs.map(t => (
                    <div key={t.txid} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-xs hover:bg-amber-50/50 transition-colors">
                      <div>
                        <span className="font-mono text-primary-600 font-bold block">{t.txid.slice(0, 16)}...</span>
                        <span className="text-[11px] text-gray-500">Block #{t.block_height} • {t.time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-900">₿ {t.total_output_btc.toFixed(4)}</span>
                        <button
                          onClick={() => onSelectTx(t)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Inspect →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500">Select an entity to view profile.</div>
        )}
      </div>
    </div>
  );
};

export default BitcoinAddressEntityExplorer;
