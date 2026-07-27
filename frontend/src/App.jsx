import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import Portfolio from './pages/Portfolio';

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/token/:id" element={<TokenDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}
