import { injectable } from 'tsyringe';
import { BaseRepository, type IBaseRepository } from '../../common/base.repository.js';
import { Role } from '../../database/models/role.model.js';

export interface IRoleRepository extends IBaseRepository<Role> {}

@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
    constructor() {
        super(Role);
    }
}
