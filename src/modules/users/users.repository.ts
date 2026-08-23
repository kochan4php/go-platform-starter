import type { User } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { prisma } from '../../database/connection.js';

export interface IUserRepository extends IBaseRepository<User> {
    // Add specific methods here if needed
}

@injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
    constructor() {
        super(prisma.user);
    }
}
