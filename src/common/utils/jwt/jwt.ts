import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

export class JwtHelper {
    public static generateToken(payload: object | string = {}, tokenSecret: string, expired: SignOptions['expiresIn']): string {
        return jwt.sign(payload, tokenSecret as string, { expiresIn: expired });
    }

    public static verifyToken(token: string, tokenSecret: string): Promise<object | string | undefined> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, tokenSecret, (error, decoded) => {
                if (error) reject(error);
                resolve(decoded);
            });
        });
    }

    public static decodeToken(token: string): JwtPayload | string | null {
        return jwt.decode(token);
    }
}
