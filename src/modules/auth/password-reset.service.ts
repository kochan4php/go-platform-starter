import type { JwtPayload } from 'jsonwebtoken';
import { injectable } from 'tsyringe';
import { JwtHelper } from '../../common/utils/jwt/jwt.js';
import { ACCESS_TOKEN_SECRET } from '../../config/env.js';

const RESET_TTL = '15m';
const PURPOSE = 'password-reset';

interface ResetPayload extends JwtPayload {
    sub?: string;
    purpose?: string;
}

/**
 * @description Stateless, purpose-scoped reset tokens (JWT, 15 min). No table needed:
 * consuming the token rotates the password, and the accompanying session wipe makes
 * any stolen token worthless past that point.
 */
@injectable()
export class PasswordResetService {
    public createToken(userId: string): string {
        return JwtHelper.generateToken({ sub: userId, purpose: PURPOSE }, ACCESS_TOKEN_SECRET, RESET_TTL);
    }

    public async consume(token: string): Promise<string | null> {
        let payload: ResetPayload;
        try {
            payload = (await JwtHelper.verifyToken(token, ACCESS_TOKEN_SECRET)) as ResetPayload;
        } catch {
            return null;
        }
        if (payload.purpose !== PURPOSE || !payload.sub) {
            return null;
        }
        return payload.sub;
    }
}
