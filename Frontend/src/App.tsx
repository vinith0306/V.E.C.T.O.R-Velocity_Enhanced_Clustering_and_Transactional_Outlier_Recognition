import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import BitcoinDashboard from './pages/bitcoin/BitcoinDashboard';
import { TransactionProvider } from './context/TransactionContext';
import { BitcoinProvider } from './context/BitcoinContext';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState<'financial' | 'bitcoin'>('bitcoin');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <TransactionProvider>
      <BitcoinProvider>
        <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
          <Header 
            isConnected={isConnected} 
            activeDomain={activeDomain}
            onDomainChange={setActiveDomain}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <main className="px-4 sm:px-6 py-5 max-w-[1720px] mx-auto">
            {activeDomain === 'bitcoin' ? (
              <BitcoinDashboard />
            ) : (
              <Dashboard />
            )}
          </main>
          
          {!isConnected && (
            <div className="fixed bottom-4 right-4 bg-red-950/90 border border-red-500/50 text-red-300 px-4 py-2 rounded-xl shadow-2xl flex items-center z-50 text-xs font-semibold backdrop-blur-md">
              <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              Disconnected from server
            </div>
          )}
        </div>
      </BitcoinProvider>
    </TransactionProvider>
  );
}

export default App;