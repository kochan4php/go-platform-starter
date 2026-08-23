import { injectable } from 'tsyringe';
import { ForbiddenError } from '../errors/AppError';

export interface AuthUser {
    id: string;
    email?: string;
    permissions?: string[];
};

type GateCallback = (user: AuthUser, ...args: any[]) => boolean;

@injectable()
export class Gate {
    private abilities: Map<string, GateCallback> = new Map();

    public define(ability: string, callback: GateCallback): void {
        this.abilities.set(ability, callback);
    }

    public allows(ability: string, user: AuthUser, ...args: any[]): boolean {
        if (!user) return false;
        const callback = this.abilities.get(ability);
        if (!callback) {
            return user.permissions?.includes(ability) ?? false;
        }
        return callback(user, ...args);
    }

    public authorize(ability: string, user: AuthUser, ...args: any[]): void {
        if (!this.allows(ability, user, ...args)) {
            throw new ForbiddenError(`You are not authorized to perform action: ${ability}`);
        }
    }
}
