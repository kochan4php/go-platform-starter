import type { Socket } from 'socket.io';
import type DecodedUser from '../../common/types/decoded-user.js';

/**
 * @description Typed event contracts for the realtime module.
 * Client → server events and their ack shapes; server → client broadcasts.
 */
export interface ClientToServerEvents {
    'room:join': (room: string, ack: (result: { joined: boolean; error?: string }) => void) => void;
    'message:send': (payload: { room: string; message: string }) => void;
}

export interface ServerToClientEvents {
    message: (payload: { room: string; from: string; message: string; at: string }) => void;
}

export type InterServerEvents = {};

export interface SocketData {
    user: DecodedUser;
}

export type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
