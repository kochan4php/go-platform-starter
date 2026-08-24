import type { Server } from 'socket.io';
import type DecodedUser from '../../common/types/decoded-user.js';
import { AccessTokenHelper } from '../../common/utils/jwt/helpers/access-token.helper.js';
import type { RealtimeSocket } from './realtime.types.js';

const ROOM_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;

/**
 * @description Handshake authentication: requires a valid JWT access token in
 * `handshake.auth.token`. Unauthenticated sockets are rejected before any handler runs.
 */
export async function socketAuth(socket: RealtimeSocket, next: (err?: Error) => void): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
        return next(new Error('Unauthorized: missing access token'));
    }

    try {
        await AccessTokenHelper.verifyAccessToken(token);
        const decoded = AccessTokenHelper.getUserPayloadFromAccessToken(token) as DecodedUser;
        if (!decoded?.id) throw new Error('malformed token payload');
        socket.data.user = decoded;
        return next();
    } catch {
        return next(new Error('Unauthorized: invalid or expired token'));
    }
}

/** Validates room names against a conservative allowlist. */
export function isValidRoom(room: string): boolean {
    return typeof room === 'string' && ROOM_PATTERN.test(room);
}
