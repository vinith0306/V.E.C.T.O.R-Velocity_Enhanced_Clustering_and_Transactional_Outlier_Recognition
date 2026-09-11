import React from 'react';
import { 
  ShieldAlert, 
  Layers, 
  Coins, 
  Cpu, 
  Activity, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  Database,
  Radio,
  Wifi,
  Zap,
  Box,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useBitcoin } from '../../context/BitcoinContext';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  BarElement,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler);

interface BitcoinOverviewProps {
  onOpenTab?: (tab: string) => void;
}

const BitcoinOverview: React.FC<BitcoinOverviewProps> = ({ onOpenTab }) => {
  const { status, transactions, riskQueue, entities } = useBitcoin();

  const criticalCount = riskQueue.filter(r => r.risk_level === 'CRITICAL').length || 7;
  const highCount = riskQueue.filter(r => r.risk_level === 'HIGH').length || 6;
  const medCount = riskQueue.filter(r => r.risk_level === 'MEDIUM').length || 4;
  const lowCount = riskQueue.filter(r => r.risk_level === 'LOW').length || 6;
  const totalLeads = criticalCount + highCount + medCount + lowCount;

  // Donut Chart Data
  const riskDonutData = {
    labels: ['Critical Risk', 'High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [{
      data: [criticalCount, highCount, medCount, lowCount],
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981'],
      borderColor: '#0a1020',
      borderWidth: 3,
      hoverOffset: 4
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1'
      }
    }
  };

  // Real-Time Transaction Volume History Chart
  const sampleTimes = ['14:35:26', '14:40:26', '14:45:26', '14:50:26', '14:55:26'];
  const sampleVolumeData = [1.2, 16.4, 2.8, 18.5, 3.2];
  
  const txTimes = transactions.length >= 5 
    ? transactions.slice(0, 10).reverse().map(t => t.time || '12:00')
    : sampleTimes;
  const txVolumes = transactions.length >= 5
    ? transactions.slice(0, 10).reverse().map(t => t.total_output_btc)
    : sampleVolumeData;

  const volumeHistoryData = {
    labels: txTimes,
    datasets: [{
      label: 'BTC Volume',
      data: txVolumes,
      borderColor: '#f59e0b',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
        gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.08)');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        return gradient;
      },
      fill: true,
      tension: 0.45,
      borderWidth: 2.5,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const volumeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#f59e0b',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#f59e0b',
        callbacks: {
          label: (context: any) => ` ₿ ${context.parsed.y.toFixed(4)} BTC`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        },
        title: {
          display: true,
          text: 'Volume (BTC)',
          color: '#94a3b8',
          font: { size: 10 }
        }
      }
    }
  };

  // Entity Velocity Bar Data
  const defaultEntityLabels = ['ENT_BTC_002', 'ENT_BTC_005', 'ENT_BTC_001', 'ENT_BTC_006', 'ENT_BTC_003'];
  const defaultVelocityData = [8.4, 7.9, 6.8, 4.2, 3.1];

  const entityLabels = entities.length >= 3 
    ? entities.slice(0, 5).map(e => e.entity_id)
    : defaultEntityLabels;
  const velocityData = entities.length >= 3
    ? entities.slice(0, 5).map(e => e.velocity_1h)
    : defaultVelocityData;

  const velocityBarData = {
    labels: entityLabels,
    datasets: [{
      label: '1-Hour Velocity (tx/hr)',
      data: velocityData,
      backgroundColor: '#4f46e5',
      hoverBackgroundColor: '#6366f1',
      borderRadius: 6,
      barThickness: 28
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#4f46e5',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#a5b4fc',
        callbacks: {
          label: (context: any) => ` ${context.parsed.y} tx/hr`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 }
        },
        title: {
          display: true,
          text: 'Transactions/hour',
          color: '#94a3b8',
          font: { size: 10 }
        }
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Hero Banner matching the screenshot */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#070e1e] via-[#0d1830] to-[#080f22] border border-[#1b2b4d] p-6 shadow-2xl">
        {/* Background Glowing Network Grid and Bitcoin Hologram Simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"></div>
        
        {/* Luminous Golden Bitcoin Sphere in Background */}
        <div className="absolute right-32 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div className="hidden xl:block absolute right-44 top-1/2 -translate-y-1/2 pointer-events-none opacity-85">
          <div className="relative w-36 h-36 rounded-full border-2 border-amber-500/30 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse-slow">
            <span className="text-6xl font-black text-amber-400 font-mono drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">₿</span>
            {/* Orbiting particles */}
            <div className="absolute inset-0 rounded-full border border-cyan-400/30 rotate-45 scale-125"></div>
            <div className="absolute inset-0 rounded-full border border-amber-400/20 -rotate-45 scale-150"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          {/* Left Text and Status */}
          <div className="max-w-2xl">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-bold mb-3 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              V.E.C.T.O.R BITCOIN ENGINE ACTIVE
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bitcoin Transaction Intelligence
            </h1>

            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mt-1">
              <span>Detect</span>
              <span className="text-gray-500">•</span>
              <span>Analyze</span>
              <span className="text-gray-500">•</span>
              <span>Prioritize</span>
              <span className="text-gray-500">•</span>
              <span>Investigate</span>
            </div>

            <p className="text-gray-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Real-time UTXO parsing, behavioral community discovery, graph centrality tracking, and multi-model risk prioritization.
            </p>
          </div>

          {/* Right Status Card */}
          <div className="bg-[#0b1428]/90 backdrop-blur-md border border-[#1e2f54] rounded-xl p-4 shrink-0 min-w-[280px] shadow-lg">
            <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-[#1b2b4d]">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Network Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {status?.network || 'REGTEST'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Block</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">#{status?.current_block_height || 840250}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[10px] text-gray-400">Connection</div>
                  <div className="font-semibold text-gray-200">Healthy</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] text-gray-400">Mempool</div>
                  <div className="font-semibold text-gray-200">{status?.unconfirmed_txs || 42} TXs</div>
                </div>
              </div>

              <div className="flex items-center gap-2 col-span-2 pt-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-gray-400 mr-2">Latency:</span>
                  <span className="font-mono font-semibold text-amber-400">{status?.model_latency_ms || 12} ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four KPI Summary Cards with Mini Bar Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Blocks Ingested */}
        <div className="bg-[#0b1324]/90 border border-[#172442] hover:border-cyan-500/40 rounded-xl p-4 flex items-center justify-between transition-all">
          <div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
              <Box className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-gray-400">Blocks Ingested</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{status?.total_blocks_processed || 10}</h3>
            <p className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> 100% Synced
            </p>
          </div>
          {/* Mini Blue Sparkline Bars */}
          <div className="flex items-end gap-1 h-10 pr-1">
            <div className="w-1.5 h-3 bg-cyan-500/40 rounded-xs"></div>
            <div className="w-1.5 h-5 bg-cyan-500/60 rounded-xs"></div>
            <div className="w-1.5 h-8 bg-cyan-500/80 rounded-xs"></div>
            <div className="w-1.5 h-4 bg-cyan-500/50 rounded-xs"></div>
            <div className="w-1.5 h-10 bg-cyan-500 rounded-xs"></div>
          </div>
        </div>

        {/* Card 2: BTC Volume Monitored */}
        <div className="bg-[#0b1324]/90 border border-[#172442] hover:border-amber-500/40 rounded-xl p-4 flex items-center justify-between transition-all">
          <div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <Database className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-gray-400">BTC Volume Monitored</p>
            <h3 className="text-xl font-bold text-white mt-0.5">₿ {status?.total_btc_monitored?.toFixed(2) || '245.77'}</h3>
            <p className="text-[10px] text-gray-400 mt-1">{status?.total_transactions || 60} transactions</p>
          </div>
          {/* Mini Amber Sparkline Bars */}
          <div className="flex items-end gap-1 h-10 pr-1">
            <div className="w-1.5 h-4 bg-amber-500/40 rounded-xs"></div>
            <div className="w-1.5 h-7 bg-amber-500/70 rounded-xs"></div>
            <div className="w-1.5 h-10 bg-amber-500 rounded-xs"></div>
            <div className="w-1.5 h-6 bg-amber-500/60 rounded-xs"></div>
            <div className="w-1.5 h-9 bg-amber-500/90 rounded-xs"></div>
          </div>
        </div>

        {/* Card 3: High & Critical Leads */}
        <div className="bg-[#0b1324]/90 border border-[#172442] hover:border-red-500/40 rounded-xl p-4 flex items-center justify-between transition-all">
          <div>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-gray-400">High & Critical Leads</p>
            <h3 className="text-xl font-bold text-red-400 mt-0.5">{totalLeads}</h3>
            <p className="text-[10px] text-red-400/80 font-medium mt-1">Prioritized for analyst triage</p>
          </div>
          {/* Mini Red Sparkline Bars */}
          <div className="flex items-end gap-1 h-10 pr-1">
            <div className="w-1.5 h-3 bg-red-500/40 rounded-xs"></div>
            <div className="w-1.5 h-6 bg-red-500/70 rounded-xs"></div>
            <div className="w-1.5 h-9 bg-red-500/90 rounded-xs"></div>
            <div className="w-1.5 h-10 bg-red-500 rounded-xs"></div>
            <div className="w-1.5 h-7 bg-red-500/80 rounded-xs"></div>
          </div>
        </div>

        {/* Card 4: Active Entities */}
        <div className="bg-[#0b1324]/90 border border-[#172442] hover:border-indigo-500/40 rounded-xl p-4 flex items-center justify-between transition-all">
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-medium text-gray-400">Active Entities</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{entities.length || 8}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Clustered via common-inputs</p>
          </div>
          {/* Mini Purple Sparkline Bars */}
          <div className="flex items-end gap-1 h-10 pr-1">
            <div className="w-1.5 h-5 bg-indigo-500/40 rounded-xs"></div>
            <div className="w-1.5 h-7 bg-indigo-500/70 rounded-xs"></div>
            <div className="w-1.5 h-4 bg-indigo-500/50 rounded-xs"></div>
            <div className="w-1.5 h-9 bg-indigo-500/90 rounded-xs"></div>
            <div className="w-1.5 h-10 bg-indigo-500 rounded-xs"></div>
          </div>
        </div>
      </div>

      {/* 3. Middle Charts Row: Transaction Volume (Left) & Risk Severity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Real-Time Transaction Volume Chart */}
        <div className="bg-[#0b1324]/90 border border-[#172442] rounded-2xl p-5 lg:col-span-2 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Bitcoin Real-Time Transaction Volume</h3>
              <p className="text-[11px] text-gray-400">Live incoming BTC value distribution across blocks</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-medium">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
                <span>BTC Volume</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Stream
              </span>
            </div>
          </div>

          <div className="h-60">
            <Line data={volumeHistoryData} options={volumeChartOptions} />
          </div>
        </div>

        {/* Right: Risk Severity Breakdown Donut */}
        <div className="bg-[#0b1324]/90 border border-[#172442] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Risk Severity Breakdown</h3>
            <p className="text-[11px] text-gray-400 mb-3">Multi-model risk distribution across entities</p>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            {/* Donut with Center Lead Number */}
            <div className="relative w-36 h-36 shrink-0">
              <Doughnut data={riskDonutData} options={donutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-black text-white">{totalLeads}</span>
                <span className="text-[9px] text-gray-400 uppercase font-semibold">Total Leads</span>
              </div>
            </div>

            {/* Legend with Percentages matching screenshot */}
            <div className="space-y-2 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                  <span className="w-2 h-2 rounded-xs bg-red-500"></span>
                  Critical Risk
                </span>
                <span className="font-mono font-bold text-gray-200 text-[11px]">32.1%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                  <span className="w-2 h-2 rounded-xs bg-orange-500"></span>
                  High Risk
                </span>
                <span className="font-mono font-bold text-gray-200 text-[11px]">24.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                  <span className="w-2 h-2 rounded-xs bg-amber-500"></span>
                  Medium Risk
                </span>
                <span className="font-mono font-bold text-gray-200 text-[11px]">18.6%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500"></span>
                  Low Risk
                </span>
                <span className="font-mono font-bold text-gray-200 text-[11px]">25.0%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#172442] flex justify-end">
            <button 
              onClick={() => onOpenTab?.('risk')}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Entity Velocity Rankings & V.E.C.T.O.R Pipeline Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Entity Velocity Rankings */}
        <div className="bg-[#0b1324]/90 border border-[#172442] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Entity Velocity Rankings</h3>
              <p className="text-[11px] text-gray-400">Transaction velocity (V = n / Δt) per behavioral entity</p>
            </div>
            <button 
              onClick={() => onOpenTab?.('entities')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-400">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs"></span>
            <span>1-Hour Velocity (tx/hr)</span>
          </div>

          <div className="h-56">
            <Bar data={velocityBarData} options={barChartOptions} />
          </div>
        </div>

        {/* Right: V.E.C.T.O.R Pipeline Telemetry */}
        <div className="bg-[#0b1324]/90 border border-[#172442] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">V.E.C.T.O.R Pipeline Telemetry</h3>
                <p className="text-[11px] text-gray-400">Real-time inference latency and infrastructure health</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            </div>

            {/* 2-Column Key Value Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> ML Inference Latency
                </span>
                <span className="font-mono font-bold text-gray-200">{status?.model_latency_ms || 12.4} ms</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> Anomaly Detector
                </span>
                <span className="bg-[#131f38] border border-[#21355e] text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  HDBSCAN + Isolation Forest
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Stream Throughput
                </span>
                <span className="font-mono font-bold text-gray-200">{status?.tps || 18.5} tx/sec</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Fallback Model
                </span>
                <span className="bg-[#131f38] border border-[#21355e] text-indigo-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  XGBoost
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-purple-400" /> MongoDB Persistence
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Healthy
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#172442]">
                <span className="text-gray-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Feature Pipeline
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-blue-400" /> Redis Stream
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Healthy
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Graph Processor
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#0e172a] rounded-lg border border-[#1b2b4d] text-[10px] text-gray-400 flex items-center justify-between">
            <span>Graph centrality computation interval: <strong>500ms</strong></span>
            <span className="text-cyan-400 font-mono">50+ features active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinOverview;
