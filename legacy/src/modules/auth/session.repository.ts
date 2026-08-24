import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { Session } from '../../database/models/session.model.js';

export interface ISessionRepository extends IBaseRepository<Session> {
    revokeSession(id: string): Promise<Session | null>;
    revokeAllForUser(userId: string): Promise<number>;
}

@injectable()
export class SessionRepository extends BaseRepository<Session> implements ISessionRepository {
    constructor() {
        super(Session);
    }

    public revokeSession(id: string): Promise<Session | null> {
        return this.update(id, { refreshToken: null });
    }

    /** Hard-deletes every session of a user (used after password reset). */
    public revokeAllForUser(userId: string): Promise<number> {
        return Session.destroy({ where: { userId } });
    }
}
