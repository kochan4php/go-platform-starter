import { inject, injectable } from 'tsyringe';
import type { IRoleRepository } from './roles.repository.js';

@injectable()
export class RoleService {
    constructor(@inject('IRoleRepository') private readonly roleRepository: IRoleRepository) {}

    public async getAllRoles(limit: number = 50, offset: number = 0): Promise<any[]> {
        return await this.roleRepository.findAll({}, { limit, offset });
    }

    public async getOneRoleById(id: string): Promise<any | null> {
        return await this.roleRepository.findById(id);
    }

    public async createRole(data: any): Promise<any> {
        return await this.roleRepository.create(data);
    }

    public async updateOneRoleById(id: string, data: any): Promise<any | null> {
        return await this.roleRepository.update(id, data);
    }

    public deleteOneRoleById(id: string): Promise<number> {
        return this.roleRepository.delete(id);
    }
}
