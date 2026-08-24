import { inject, injectable } from 'tsyringe';
import type { ISessionRepository } from './session.repository.js';

@injectable()
export class SessionService {
    constructor(@inject('ISessionRepository') private readonly sessionRepository: ISessionRepository) {}

    public async getAllSessions(filter: any = {}): Promise<any[]> {
        return await this.sessionRepository.findAll(filter);
    }

    public async getOneSession(filter: any): Promise<any | null> {
        return await this.sessionRepository.findOne(filter);
    }

    public async getOneSessionById(id: string): Promise<any | null> {
        return await this.sessionRepository.findById(id);
    }

    public async createSession(data: any): Promise<any> {
        return await this.sessionRepository.create(data);
    }

    public async updateOneSessionById(id: string, data: any): Promise<any> {
        return await this.sessionRepository.update(id, data);
    }

    public async deleteOneSessionById(id: string): Promise<any> {
        return await this.sessionRepository.delete(id);
    }

    public async revokeSession(id: string): Promise<any> {
        return await this.sessionRepository.revokeSession(id);
    }

    /** Hard-deletes every session of a user (password reset). */
    public revokeAllForUser(userId: string): Promise<number> {
        return this.sessionRepository.revokeAllForUser(userId);
    }
}
