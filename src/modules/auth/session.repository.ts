import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { Session } from '../../database/models/session.model.js';

export interface ISessionRepository extends IBaseRepository<Session> {
    revokeSession(id: string): Promise<Session | null>;
}

@injectable()
export class SessionRepository extends BaseRepository<Session> implements ISessionRepository {
    constructor() {
        super(Session);
    }

    public revokeSession(id: string): Promise<Session | null> {
        return this.update(id, { refreshToken: null });
    }
}
