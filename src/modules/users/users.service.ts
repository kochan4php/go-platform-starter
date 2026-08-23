import { inject, injectable } from 'tsyringe';
import type { IUserRepository } from './users.repository.js';

@injectable()
export class UserService {
    constructor(@inject('IUserRepository') private readonly userRepository: IUserRepository) {}

    public async getAllUsers(filter: any = {}, limit: number = 10, offset: number = 0): Promise<any[]> {
        return await this.userRepository.findAll(filter, {
            select: { id: true, name: true, phoneNumber: true, email: true, avatar: true, bio: true },
            take: limit,
            skip: offset,
        });
    }

    public async getOneUser(filter: any, select: any = {}, throwError: boolean = false): Promise<any | null> {
        const user = await this.userRepository.findOne(filter);
        return user;
    }

    public async getOneUserById(id: string): Promise<any | null> {
        const user = await this.userRepository.findById(id);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        return null;
    }

    public async createUser(data: any): Promise<any> {
        return await this.userRepository.create(data);
    }

    public async updateOneUserById(id: string, data: any): Promise<any> {
        return await this.userRepository.update(id, data);
    }

    public async deleteOneUserById(id: string): Promise<any> {
        return await this.userRepository.delete(id);
    }
}
