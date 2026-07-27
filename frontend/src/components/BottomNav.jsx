import { useLocation, useNavigate } from 'react-router-dom';
import { useTonConnect } from '../hooks/useTonConnect';

const tabs = [
  {
    key: 'markets',
    path: '/',
    exact: true,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="12" width="4" height="10" rx="1" fill={active ? 'var(--accent)' : 'var(--text-muted)'} />
        <rect x="10" y="7" width="4" height="15" rx="1" fill={active ? 'var(--accent)' : 'var(--text-muted)'} />
        <rect x="18" y="2" width="4" height="20" rx="1" fill={active ? 'var(--accent)' : 'var(--text-muted)'} />
      </svg>
    ),
    label: 'Markets',
  },
  {
    key: 'trade',
    path: null,
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={active ? 'var(--green)' : 'var(--bg-hover)'} stroke={active ? 'var(--green)' : 'var(--border)'} strokeWidth="1.5" />
        <line x1="12" y1="7" x2="12" y2="17" stroke={active ? '#fff' : 'var(--text-muted)'} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="7" y1="12" x2="17" y2="12" stroke={active ? '#fff' : 'var(--text-muted)'} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
    label: 'Trade',
  },
  {
    key: 'portfolio',
    path: '/portfolio',
    exact: true,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="15" rx="2" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" fill="none" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" fill="none" />
        <line x1="12" y1="12" x2="12" y2="16" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="14" x2="14" y2="14" stroke={active ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: 'Portfolio',
  },
  {
    key: 'wallet',
    path: '/wallet',
    exact: true,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="2" stroke={active ? 'var(--ton)' : 'var(--text-muted)'} strokeWidth="2" fill="none" />
        <path d="M16 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill={active ? 'var(--ton)' : 'var(--text-muted)'} />
        <path d="M2 10h20" stroke={active ? 'var(--ton)' : 'var(--text-muted)'} strokeWidth="2" />
      </svg>
    ),
    label: 'Wallet',
  },
];

export default function BottomNav({ onOpenTrade }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { connected, connect, shortAddress } = useTonConnect();

  function isActive(tab) {
    if (tab.key === 'trade') return false;
    if (tab.key === 'markets') return pathname === '/' && !search.includes('sort=change');
    return tab.exact ? pathname === tab.path : pathname.startsWith(tab.path);
  }

  function handleTab(tab) {
    if (tab.key === 'trade')  return onOpenTrade?.();
    if (tab.key === 'wallet') return connected ? undefined : connect();
    navigate(tab.path);
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      height: '60px',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab);
        const label  = tab.key === 'wallet' ? (connected ? shortAddress : 'Wallet') : tab.label;
        const color  = tab.key === 'wallet' ? 'var(--ton)' : tab.key === 'trade' ? 'var(--green)' : 'var(--accent)';

        return (
          <button
            key={tab.key}
            onClick={() => handleTab(tab)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: '2px', borderRadius: '0 0 2px 2px', background: color,
              }} />
            )}
            {tab.icon(active)}
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              color: active ? color : 'var(--text-muted)',
              letterSpacing: '0.2px',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
