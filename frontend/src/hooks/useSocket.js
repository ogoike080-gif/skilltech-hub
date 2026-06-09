import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket() {
  const token = localStorage.getItem('sth_token');

  useEffect(() => {
    if (!token || socketInstance) return;
    socketInstance = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 1000,
    });
    socketInstance.on('connect', () => console.log('Socket connected'));
    socketInstance.on('connect_error', (err) => console.warn('Socket error:', err.message));

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, [token]);

  return socketInstance;
}

export function useSessionSocket(sessionId, handlers = {}) {
  const socket = useSocket();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket || !sessionId) return;
    socket.emit('session:join', { sessionId });

    const currentHandlers = handlersRef.current;
    Object.entries(currentHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      socket.emit('session:leave', { sessionId });
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [sessionId, socket]);

  const emit = (event, data) => socket?.emit(event, data);
  return { emit };
}
