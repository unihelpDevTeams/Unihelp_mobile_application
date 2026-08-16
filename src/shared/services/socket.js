import { io } from 'socket.io-client';
import { getApiUrl } from './backend';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(getApiUrl(), {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
};
