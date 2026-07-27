import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import TradeModal from './components/TradeModal';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

function Layout() {
  const { pathname } = useLocation();
  const isTokenPage = pathname.startsWith('/token/');
  const [tradeOpen, setTradeOpen] = useState(false);

  return (
    <>
      <Navbar />
      <div style={{ paddingBottom: isTokenPage ? 0 : '60px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/token/:id" element={<TokenDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      {!isTokenPage && <BottomNav onOpenTrade={() => setTradeOpen(true)} />}
      {tradeOpen && <TradeModal onClose={() => setTradeOpen(false)} />}
    </>
  );
}

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}
