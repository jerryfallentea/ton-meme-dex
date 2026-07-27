import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND = import.meta.env.VITE_API_URL || '';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BACKEND, { transports: ['websocket', 'polling'] });
  }
  return socketInstance;
}

export function useSocket(tokenId, {
  onCandle, onCandleTick, onTransaction, onPriceUpdate,
  onTpCreated, onTpUpdated, onTpCancelled, onTpExecuted,
} = {}) {
  const handlersRef = useRef({});
  handlersRef.current = { onCandle, onCandleTick, onTransaction, onPriceUpdate, onTpCreated, onTpUpdated, onTpCancelled, onTpExecuted };

  useEffect(() => {
    if (!tokenId) return;
    const socket = getSocket();
    socket.emit('join-token', tokenId);

    const handlers = {
      'new-candle':      (data) => { if (data.tokenId === tokenId) handlersRef.current.onCandle?.(data.candle); },
      'candle-tick':     (data) => { if (data.tokenId === tokenId) handlersRef.current.onCandleTick?.(data.candle); },
      'new-transaction': (tx)   => { if (tx.token_id  === tokenId) handlersRef.current.onTransaction?.(tx); },
      'price-update':    (data) => { if (data.tokenId === tokenId) handlersRef.current.onPriceUpdate?.(data.price); },
      'tp-order-created': (data) => handlersRef.current.onTpCreated?.(data),
      'tp-order-updated': (data) => handlersRef.current.onTpUpdated?.(data),
      'tp-order-cancelled': (data) => handlersRef.current.onTpCancelled?.(data),
      'tp-order-executed': (data) => handlersRef.current.onTpExecuted?.(data),
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      socket.emit('leave-token', tokenId);
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, [tokenId]);
}

export function useWalletSocket(wallet, { onTpExecuted } = {}) {
  const handlersRef = useRef({ onTpExecuted });
  handlersRef.current = { onTpExecuted };

  useEffect(() => {
    if (!wallet) return;
    const socket = getSocket();
    socket.emit('join-wallet', wallet);

    const handler = (data) => handlersRef.current.onTpExecuted?.(data);
    socket.on('tp-executed', handler);

    return () => {
      socket.emit('leave-wallet', wallet);
      socket.off('tp-executed', handler);
    };
  }, [wallet]);
}
