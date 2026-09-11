import React from 'react';
import { 
  Activity, 
  Coins, 
  CreditCard, 
  Search, 
  Bell, 
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useBitcoin } from '../context/BitcoinContext';

interface HeaderProps {
  isConnected: boolean;
  activeDomain: 'financial' | 'bitcoin';
  onDomainChange: (domain: 'financial' | 'bitcoin') => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isConnected, 
  activeDomain, 
  onDomainChange,
  searchQuery = '',
  onSearchChange
}) => {
  const { stats } = useTransactions();
  const { status: btcStatus } = useBitcoin();

  return (
    <header className="bg-[#080d1a]/95 backdrop-blur-md border-b border-[#152037] sticky top-0 z-40 px-5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: V.E.C.T.O.R Logo & SIH Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* Logo Icon with golden pulse */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-[#131c33] to-[#0a1020] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Activity className="h-5 w-5 text-amber-400 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-white">V . E . C . T . O . R</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-md">
                  SIH26146
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-gray-400 font-medium tracking-tight">
                Velocity-Enhanced Clustering for Transactional Outlier Recognition
              </p>
            </div>
          </div>

          {/* Domain Switcher Pills */}
          <div className="flex items-center bg-[#0d1527] p-1 rounded-xl border border-[#1b2742] ml-4">
            <button
              onClick={() => onDomainChange('bitcoin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDomain === 'bitcoin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Bitcoin Intelligence
            </button>
            <button
              onClick={() => onDomainChange('financial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDomain === 'financial'
                  ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Financial Monitoring
            </button>
          </div>
        </div>

        {/* Right Controls: Search, Notifications, Analyst Profile */}
        <div className="flex items-center gap-3.5">
          {/* Search Bar */}
          <div className="relative hidden lg:block w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search TXID, entity, or address..."
              className="w-full bg-[#0d1527] border border-[#1b2742] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 rounded-xl bg-[#0d1527] border border-[#1b2742] text-gray-300 hover:text-white hover:border-gray-600 transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#080d1a]"></span>
          </button>

          {/* Analyst Profile Avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#1b2742]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              VN
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-200 leading-tight">Analyst Vinith</div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;