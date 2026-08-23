import type { Session } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { prisma } from '../../database/connection.js';

export interface ISessionRepository extends IBaseRepository<Session> {
    // Add specific methods here if needed
}

@injectable()
export class SessionRepository extends BaseRepository<Session> implements ISessionRepository {
    constructor() {
        super(prisma.session);
    }
}
