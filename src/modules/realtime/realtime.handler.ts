import type { Server } from 'socket.io';
import { logger, moduleLogger } from '../../common/utils/logger.js';
import type { RealtimeSocket } from './realtime.types.js';
import { isValidRoom, socketAuth } from './socket.auth.js';

const log = moduleLogger('realtime');

/**
 * @description Realtime wiring: handshake auth + typed room/broadcast example.
 * Clients join a room, then any member's `message:send` fans out to the whole room
 * as a `message` event. Extend with your own events in realtime.types.ts.
 */
export function registerRealtime(io: Server): void {
    io.use(socketAuth);

    io.on('connection', (socket: RealtimeSocket) => {
        const user = socket.data.user;
        log.info({ socketId: socket.id, userId: user?.id }, 'client connected');

        socket.on('room:join', (room, ack) => {
            if (!isValidRoom(room)) {
                ack({ joined: false, error: 'invalid room name' });
                return;
            }
            socket.join(room);
            ack({ joined: true });
        });

        socket.on('message:send', ({ room, message }) => {
            if (!isValidRoom(room) || typeof message !== 'string' || message.length === 0 || message.length > 2000) {
                socket.emit('message', { room, from: 'system', message: 'invalid message payload', at: new Date().toISOString() });
                return;
            }
            io.to(room).emit('message', {
                room,
                from: user.id,
                message,
                at: new Date().toISOString(),
            });
        });

        socket.on('disconnect', (reason) => {
            log.info({ socketId: socket.id, userId: user?.id, reason }, 'client disconnected');
        });
    });
}
