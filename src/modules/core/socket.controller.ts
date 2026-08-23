/**
 * @description This file contain a function for handle websocket / socket.io events
 * @description It will handle all websocket / socket.io events from client side
 * @author {Deo Sbrn}
 */

import type { Server, Socket } from 'socket.io';
import { logger } from '../../common/utils/logger.js';

/**
 * @description Handle socket connection
 * @param {Socket<DefaultEventsMap>} socket - Socket object
 * @param {Server<DefaultEventsMap>} io - Socket.io object
 * @returns {void} - Void
 */
export default function SocketController(socket: Socket, io: Server): void {
    logger.info('Client', `connected: ${socket.id}`);

    socket.on('disconnect', () => {
        logger.info('Client', `disconnected: ${socket.id}`);
    });
}
