import React from 'react';
import { 
  Layers, 
  Users, 
  Activity, 
  Coins, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { useBitcoin } from '../../context/BitcoinContext';

const BitcoinBehavioralClusters: React.FC = () => {
  const { clusters, entities } = useBitcoin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            HDBSCAN Behavioral Communities
          </h2>
          <p className="text-xs text-gray-500">Unsupervised density clustering over UMAP-reduced behavioral feature vectors</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {clusters.length} Distinct Communities
        </span>
      </div>

      {/* Cluster Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {clusters.map(c => {
          const matchedEntities = entities.filter(e => e.cluster_id === c.cluster_id);
          return (
            <div key={c.cluster_id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4 hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                    Community #{c.cluster_id}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-0.5">{c.name}</h3>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  c.anomaly_rate_pct > 50 ? 'bg-danger-100 text-danger-800' : 'bg-success-100 text-success-800'
                }`}>
                  {c.anomaly_rate_pct}% Outliers
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200/60">
                {c.description}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                <div>
                  <span className="text-[11px] text-gray-400 block">Entities</span>
                  <span className="text-xs font-mono font-bold text-gray-900">{c.entity_count}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Avg Inflow</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">₿ {c.avg_volume_btc}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">Velocity</span>
                  <span className="text-xs font-mono font-bold text-amber-600">{c.avg_velocity_1h} tx/h</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">Sample Clustered Entities:</span>
                <div className="flex flex-wrap gap-1">
                  {matchedEntities.slice(0, 3).map(e => (
                    <span key={e.entity_id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {e.entity_id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scientific Principle Notice */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-900">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Methodological Design:</strong> Communities are discovered organically via HDBSCAN density clustering without pre-imposing fixed category counts. Anomaly detection (Isolation Forest) is specialized per cluster so what is normal for high-frequency streams is not falsely flagged against low-frequency whale settlements.
        </div>
      </div>
    </div>
  );
};

export default BitcoinBehavioralClusters;
