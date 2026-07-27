import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import Portfolio from './pages/Portfolio';

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

// Hide bottom nav on token detail (it has its own bottom bar)
function Layout() {
  const { pathname } = useLocation();
  const isTokenPage = pathname.startsWith('/token/');

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
      {!isTokenPage && <BottomNav />}
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
