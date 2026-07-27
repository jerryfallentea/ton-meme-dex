import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// In production, VITE_API_URL points to Railway backend
// In development, empty string lets Vite proxy handle it
const BACKEND = import.meta.env.VITE_API_URL || '';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BACKEND, { transports: ['websocket', 'polling'] });
  }
  return socketInstance;
}

export function useSocket(tokenId, { onCandle, onTransaction, onPriceUpdate } = {}) {
  const handlersRef = useRef({ onCandle, onTransaction, onPriceUpdate });
  handlersRef.current = { onCandle, onTransaction, onPriceUpdate };

  useEffect(() => {
    if (!tokenId) return;
    const socket = getSocket();

    socket.emit('join-token', tokenId);

    const handleCandle = (data) => {
      if (data.tokenId === tokenId && handlersRef.current.onCandle) {
        handlersRef.current.onCandle(data.candle);
      }
    };
    const handleTx = (tx) => {
      if (tx.token_id === tokenId && handlersRef.current.onTransaction) {
        handlersRef.current.onTransaction(tx);
      }
    };
    const handlePrice = (data) => {
      if (data.tokenId === tokenId && handlersRef.current.onPriceUpdate) {
        handlersRef.current.onPriceUpdate(data.price);
      }
    };

    socket.on('new-candle', handleCandle);
    socket.on('new-transaction', handleTx);
    socket.on('price-update', handlePrice);

    return () => {
      socket.emit('leave-token', tokenId);
      socket.off('new-candle', handleCandle);
      socket.off('new-transaction', handleTx);
      socket.off('price-update', handlePrice);
    };
  }, [tokenId]);
}
