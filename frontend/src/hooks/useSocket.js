import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socketInstance = null;

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  'https://skilltech-hub-production.up.railway.app';

export function useSocket() {
  const token = localStorage.getItem('sth_token');

  useEffect(() => {
    if (!token) return;

    // Don't recreate if already connected
    if (socketInstance?.connected) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },

        transports: ['websocket', 'polling'],

        withCredentials: true,

        autoConnect: true,

        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance.id);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('❌ Socket error:', err.message);
      });

      // 🔔 Notify instructor when a student joins a live class
      socketInstance.on('live:student-joined', (data) => {
        toast.success(
          `${data.studentName} joined "${data.sessionTitle}"`,
          {
            duration: 6000,
            icon: '🎓',
          }
        );
      });
    }

    return () => {
      // Keep singleton alive between pages
      // Do NOT disconnect here
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

    Object.entries(handlersRef.current).forEach(
      ([event, handler]) => {
        socket.on(event, handler);
      }
    );

    return () => {
      socket.emit('session:leave', { sessionId });

      Object.entries(handlersRef.current).forEach(
        ([event, handler]) => {
          socket.off(event, handler);
        }
      );
    };
  }, [sessionId, socket]);

  const emit = (event, data) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  };

  return {
    socket,
    emit,
  };
}