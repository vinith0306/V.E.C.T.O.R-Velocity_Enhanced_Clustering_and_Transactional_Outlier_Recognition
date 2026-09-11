import React, { useState } from 'react';
import { 
  Home,
  Radio, 
  Search, 
  Users, 
  ShieldAlert, 
  Share2, 
  Layers, 
  TrendingUp, 
  FolderOpen,
  Cpu,
  Database,
  Sliders,
  ChevronRight,
  ArrowRight,
  Coins
} from 'lucide-react';
import BitcoinOverview from './BitcoinOverview';
import BitcoinLiveTransactions from './BitcoinLiveTransactions';
import BitcoinTransactionExplorer from './BitcoinTransactionExplorer';
import BitcoinAddressEntityExplorer from './BitcoinAddressEntityExplorer';
import BitcoinRiskQueue from './BitcoinRiskQueue';
import BitcoinTransactionGraph from './BitcoinTransactionGraph';
import BitcoinBehavioralClusters from './BitcoinBehavioralClusters';
import BitcoinAnomalyTimeline from './BitcoinAnomalyTimeline';
import BitcoinInvestigations from './BitcoinInvestigations';
import { BitcoinTransaction, BitcoinRiskLead } from '../../types/bitcoin';
import { useBitcoin } from '../../context/BitcoinContext';

type Tab = 'overview' | 'live' | 'explorer' | 'entities' | 'risk' | 'graph' | 'clusters' | 'timeline' | 'investigations';

const BitcoinDashboard: React.FC = () => {
  const { setSelectedTx, transactions, riskQueue } = useBitcoin();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activeGraphTarget, setActiveGraphTarget] = useState<string | null>(null);
  const [activeLeadForCase, setActiveLeadForCase] = useState<BitcoinRiskLead | null>(null);

  const handleSelectTx = (tx: BitcoinTransaction) => {
    setSelectedTx(tx);
    setActiveTab('explorer');
  };

  const handleOpenGraph = (id: string) => {
    setActiveGraphTarget(id);
    setActiveTab('graph');
  };

  const handleCreateCase = (lead: BitcoinRiskLead) => {
    setActiveLeadForCase(lead);
    setActiveTab('investigations');
  };

  const mainNavItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'live', label: 'Live Stream', icon: Radio },
    { id: 'explorer', label: 'TX Explorer', icon: Search },
    { id: 'entities', label: 'Entity Explorer', icon: Users },
    { id: 'risk', label: 'Risk Queue', icon: ShieldAlert, badge: riskQueue.length },
    { id: 'graph', label: 'Transaction Graph', icon: Share2 },
    { id: 'clusters', label: 'Behavioral Clusters', icon: Layers },
    { id: 'timeline', label: 'Anomaly Timeline', icon: TrendingUp },
    { id: 'investigations', label: 'Investigations', icon: FolderOpen }
  ];

  const systemNavItems = [
    { id: 'models', label: 'Model Performance', icon: Cpu },
    { id: 'sources', label: 'Data Sources', icon: Database },
    { id: 'settings', label: 'Settings', icon: Sliders }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-5 pb-16">
      {/* Left Sidebar matching the reference screenshot */}
      <aside className="w-full lg:w-60 shrink-0 space-y-5">
        {/* Navigation Items Box */}
        <div className="bg-[#0b1222]/90 border border-[#17223b] rounded-2xl p-2.5 backdrop-blur-md">
          <nav className="space-y-1">
            {mainNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-l-4 border-amber-500 text-amber-400 font-bold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Section */}
          <div className="mt-5 pt-4 border-t border-[#17223b]">
            <p className="px-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              SYSTEM
            </p>
            <div className="space-y-1">
              {systemNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab('overview')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cyber Hexagonal Badge: FROM BLOCKCHAIN DATA TO INVESTIGATIVE INTELLIGENCE */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0c162b] to-[#080e1c] border border-blue-500/20 rounded-2xl p-4 shadow-lg text-center">
          {/* Cyber glowing background grid accents */}
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="w-8 h-8 mx-auto mb-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div className="text-[11px] font-black tracking-wider uppercase text-gray-300">
              FROM <span className="text-amber-400">BLOCKCHAIN DATA</span>
            </div>
            <div className="text-[11px] font-black tracking-wider uppercase text-amber-400 mt-0.5">
              TO <span className="text-cyan-400">INVESTIGATIVE</span>
            </div>
            <div className="text-[11px] font-black tracking-wider uppercase text-cyan-400 mt-0.5">
              INTELLIGENCE
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
              <span className="font-mono font-bold tracking-widest text-gray-300">V . E . C . T . O . R</span>
              <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-mono">v2.0.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Main Content Area */}
      <main className="flex-1 min-w-0 space-y-6">
        {activeTab === 'overview' && <BitcoinOverview onOpenTab={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === 'live' && <BitcoinLiveTransactions onSelectTx={handleSelectTx} />}
        {activeTab === 'explorer' && <BitcoinTransactionExplorer onOpenGraph={handleOpenGraph} />}
        {activeTab === 'entities' && <BitcoinAddressEntityExplorer onSelectTx={handleSelectTx} onOpenGraph={handleOpenGraph} />}
        {activeTab === 'risk' && <BitcoinRiskQueue onSelectTx={handleSelectTx} onCreateCase={handleCreateCase} />}
        {activeTab === 'graph' && <BitcoinTransactionGraph initialNodeId={activeGraphTarget} />}
        {activeTab === 'clusters' && <BitcoinBehavioralClusters />}
        {activeTab === 'timeline' && <BitcoinAnomalyTimeline />}
        {activeTab === 'investigations' && <BitcoinInvestigations initialLead={activeLeadForCase} />}
      </main>

      {/* Floating Sticky Live Feed Ticker at Bottom */}
      <div className="fixed bottom-3 left-4 right-4 z-40 bg-[#0a1120]/95 backdrop-blur-md border border-[#1c2a4a] rounded-xl px-4 py-2 flex items-center justify-between gap-3 shadow-2xl shadow-black/80">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase">
            Live Feed
          </span>
        </div>

        {/* Live Transaction Chips */}
        <div className="flex items-center gap-4 overflow-x-auto text-xs no-scrollbar py-0.5">
          {transactions.slice(0, 6).map((tx, idx) => {
            const isCrit = tx.risk_level === 'CRITICAL';
            const isHigh = tx.risk_level === 'HIGH';
            const isMed = tx.risk_level === 'MEDIUM';

            return (
              <div 
                key={tx.txid || idx}
                onClick={() => handleSelectTx(tx)}
                className="cursor-pointer flex items-center gap-2 bg-[#0e172a] hover:bg-[#16233f] border border-[#1e2e50] px-2.5 py-1 rounded-lg transition-all shrink-0"
              >
                <span className="font-mono text-gray-300 text-[11px]">{tx.txid.slice(0, 8)}...</span>
                <span className="font-mono font-bold text-amber-400 text-[11px]">₿ {tx.total_output_btc?.toFixed(4)}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                  isHigh ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                  isMed ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {tx.risk_level || 'LOW'}
                </span>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        <button 
          onClick={() => setActiveTab('live')}
          className="shrink-0 flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default BitcoinDashboard;
