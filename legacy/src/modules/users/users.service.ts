import { inject, injectable } from 'tsyringe';
import { HashHelper } from '../../common/utils/hash.helper.js';
import type { IUserRepository } from './users.repository.js';

@injectable()
export class UserService {
    constructor(@inject('IUserRepository') private readonly userRepository: IUserRepository) {}

    public async getAllUsers(filter: any = {}, limit: number = 10, offset: number = 0): Promise<{ users: any[]; total: number }> {
        const { rows, total } = await this.userRepository.paginate(filter, {
            limit,
            offset,
            attributes: { exclude: ['password'] },
        });
        return { users: rows, total };
    }

    public async getOneUser(filter: any): Promise<any | null> {
        return await this.userRepository.findOne(filter);
    }

    public async getOneUserById(id: string): Promise<any | null> {
        const user = await this.userRepository.findById(id);
        if (!user) return null;
        return this.stripPassword(user);
    }

    /**
     * @description Single hashing location: callers pass a RAW password and it is hashed here.
     */
    public async createUser(data: any): Promise<any> {
        const payload = { ...data };
        if (payload.password) {
            payload.password = await HashHelper.hash(payload.password);
        }
        const user = await this.userRepository.create(payload);
        return this.stripPassword(user);
    }

    public async updateOneUserById(id: string, data: any): Promise<any | null> {
        const user = await this.userRepository.update(id, data);
        if (!user) return null;
        return this.stripPassword(user);
    }

    /**
     * @description Password changes go through here (reset flow, profile change) so the
     * raw password is hashed at exactly one place, like createUser.
     */
    public async changeUserPassword(userId: string, rawPassword: string): Promise<boolean> {
        const user = await this.userRepository.findById(userId);
        if (!user) return false;
        user.password = await HashHelper.hash(rawPassword);
        await user.save();
        return true;
    }

    public deleteOneUserById(id: string): Promise<number> {
        return this.userRepository.delete(id);
    }

    private stripPassword(user: any): any {
        const json = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
        delete json.password;
        return json;
    }
}
