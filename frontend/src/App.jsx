import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import Admin from './pages/Admin';

const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/token/:id" element={<TokenDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}
