import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import TradeModal from './components/TradeModal';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import Portfolio from './pages/Portfolio';

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

const CUSTOM_WALLETS = [
  {
    appName: 'trust_wallet',
    name: 'Trust Wallet',
    imageUrl: 'https://assets-cdn.trustwallet.com/dapps/trust.logo.png',
    aboutUrl: 'https://trustwallet.com',
    universalLink: 'https://link.trustwallet.com/ton-connect',
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
    platforms: ['ios', 'android', 'chrome', 'firefox', 'edge', 'safari'],
  },
];

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
    <TonConnectUIProvider manifestUrl={MANIFEST_URL} walletsListConfiguration={{ includeWallets: CUSTOM_WALLETS }}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}
