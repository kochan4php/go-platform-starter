import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { inject, injectable } from 'tsyringe';
import { RequirePermission } from '../../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { logger } from '../../common/utils/logger.js';
import { UserService } from './users.service.js';

@injectable()
export class UserController {
    constructor(@inject(UserService) private readonly userService: UserService) {}

    @RequirePermission('user:read:any')
    public async getAllUsers(req: Request, res: Response): Promise<Response> {
        try {
            const limit = Number(req.query.limit) || 10;
            const offset = Number(req.query.offset) || 0;
            const users = await this.userService.getAllUsers({}, limit, offset);

            return resSuccess(res, 200, 'Success get all users', { users });
        } catch (error: any) {
            logger.error({ err: error }, 'UserController.getAllUsers failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }

    @RequirePermission('user:read:any')
    public async getUserById(req: Request, res: Response): Promise<Response> {
        try {
            const user = await this.userService.getOneUserById(req.params.id as string);
            if (!user) {
                return resFailed(res, 404, 'User not found');
            }

            return resSuccess(res, 200, 'Success get user by id', { user });
        } catch (error: any) {
            logger.error({ err: error }, 'UserController.getUserById failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }

    @RequirePermission('user:create:any')
    public async createUser(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phoneNumber, email, password } = req.body;
            const existing = await this.userService.getOneUser({ [Op.or]: [{ phoneNumber }, { email }] });
            if (existing) {
                return resFailed(res, 409, 'Phone number or email already exists');
            }

            // Hashing happens inside UserService.createUser — single hash location
            const user = await this.userService.createUser({ name, phoneNumber, email, password });

            return resSuccess(res, 201, 'Success create new user', { user });
        } catch (error: any) {
            logger.error({ err: error }, 'UserController.createUser failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }

    @RequirePermission('user:update:any')
    public async updateUserById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { name, phoneNumber, email, avatar, bio } = req.body;
            const user = await this.userService.updateOneUserById(id as string, { name, phoneNumber, email, avatar, bio });

            if (!user) {
                return resFailed(res, 404, 'User not found');
            }

            return resSuccess(res, 200, 'Success update user by id', { user });
        } catch (error: any) {
            logger.error({ err: error }, 'UserController.updateUserById failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }

    @RequirePermission('user:delete:any')
    public async deleteUserById(req: Request, res: Response): Promise<Response> {
        try {
            const deleted = await this.userService.deleteOneUserById(req.params.id as string);
            if (!deleted) {
                return resFailed(res, 404, 'User not found');
            }

            return resSuccess(res, 200, 'Success delete user by id');
        } catch (error: any) {
            logger.error({ err: error }, 'UserController.deleteUserById failed');
            return resFailed(res, error.statusCode || 500, 'Internal Server Error');
        }
    }
}
