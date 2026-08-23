import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { User } from '../../database/models/user.model.js';

export interface IUserRepository extends IBaseRepository<User> {}

@injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
    constructor() {
        super(User);
    }
}
