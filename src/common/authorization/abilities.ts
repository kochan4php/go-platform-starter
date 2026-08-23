import { container } from 'tsyringe';
import { Gate } from './gate.js';

export function registerAbilities(): void {
    const gate = container.resolve(Gate);

    // Instead of hardcoding 'admin', we rely strictly on whether the user possesses the correct permission.
    // The mapping of role -> permission is done in the DB.

    gate.define('user:read:own', (user, targetUserId: string) => {
        return (user.permissions?.includes('user:read:own') ?? false) && user.id === targetUserId;
    });

    gate.define('user:update:own', (user, targetUserId: string) => {
        return (user.permissions?.includes('user:update:own') ?? false) && user.id === targetUserId;
    });

    gate.define('user:delete:own', (user, targetUserId: string) => {
        return (user.permissions?.includes('user:delete:own') ?? false) && user.id === targetUserId;
    });
}
