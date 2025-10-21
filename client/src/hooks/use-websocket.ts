import { useState, useEffect, useRef } from 'react';
import { type WSMessage } from '@shared/schema';

interface WebSocketState {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    connectionStatus: 'disconnected',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionStatus: 'connected',
        }));
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'disconnected',
        }));

        // 自動重連邏輯
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionStatus: 'error',
        }));
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'error',
      }));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionStatus: 'disconnected',
    }));
  };

  useEffect(() => {
    // WebSocket 在當前實現中被禁用，所以這裡只提供模擬狀態
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionStatus: 'disconnected',
    }));

    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}