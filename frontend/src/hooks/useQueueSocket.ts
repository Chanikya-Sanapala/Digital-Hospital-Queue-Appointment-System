import { useEffect, useRef, useState, useCallback } from 'react';

interface UseQueueSocketProps {
  organizationId?: string;
  departmentId?: string;
  onEvent?: (event: { event: string; data: any }) => void;
}

export const useQueueSocket = ({ organizationId, departmentId, onEvent }: UseQueueSocketProps) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!organizationId || !departmentId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.hostname}:8000/ws`;
    const url = `${host}/queue/${organizationId}/${departmentId}`;

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Start ping keepalive
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const parsed = JSON.parse(event.data);
          if (onEvent) {
            onEvent(parsed);
          }
        } catch (e) {
          console.error('WebSocket parse error', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        clearInterval(pingIntervalRef.current);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection notice:', err);
        socket.close();
      };
    } catch (e) {
      console.warn('WebSocket connect error', e);
    }
  }, [organizationId, departmentId, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
};

