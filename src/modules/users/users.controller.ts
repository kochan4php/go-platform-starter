import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { RequirePermission } from '../../common/authorization/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import { HashHelper } from '../../common/utils/hash.helper.js';
import { logger } from '../../common/utils/logger.js';
import { UserService } from './users.service.js';

@injectable()
export class UserController {
    constructor(@inject(UserService) private readonly userService: UserService) {}

    @RequirePermission('user:read:any')
    public async getAllUsers(req: Request, res: Response): Promise<Response> {
        try {
            const limit = typeof req.query.limit === 'number' ? req.query.limit : 10;
            const offset = typeof req.query.offset === 'number' ? req.query.offset : 0;
            const users = await this.userService.getAllUsers({}, Number(limit), Number(offset));

            if (!users.length) {
                const message: string = 'Users empty';
                return resFailed(res, 200, message);
            }

            const message: string = 'Success get all users';
            return resSuccess(res, 200, message, { users });
        } catch (error: any) {
            logger.error('UserController.getAllUsers', error.message);
            return resFailed(res, error.statusCode || 500, error.message);
        }
    }

    @RequirePermission('user:read:any') // Or own, depending on how Gate is implemented
    public async getUserById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const user = await this.userService.getOneUserById(id as string);

            if (!user) {
                const message: string = 'User not found';
                return resFailed(res, 404, message);
            }

            const message: string = 'Success get user by id';
            return resSuccess(res, 200, message, { user });
        } catch (error: any) {
            logger.error('UserController.getUserById', error.message);
            return resFailed(res, error.statusCode || 500, error.message);
        }
    }

    @RequirePermission('user:create:any')
    public async createUser(req: Request, res: Response): Promise<Response> {
        try {
            const { name, phoneNumber, email, password } = req.body;
            const existsUser = await this.userService.getOneUser({ OR: [{ phoneNumber }, { email }] });

            if (existsUser) {
                const message: string = 'Username or email already exists';
                return resFailed(res, 400, message);
            }

            const passwordHash = await HashHelper.hash(password);
            const data = { name, phoneNumber, email, password: passwordHash };
            const user = await this.userService.createUser(data);

            const message: string = 'Success create new user';
            return resSuccess(res, 201, message, { user });
        } catch (error: any) {
            logger.error('UserController.createUser', error.message);
            return resFailed(res, error.statusCode || 500, error.message);
        }
    }

    @RequirePermission('user:update:any')
    public async updateUserById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const currentUser = (req as any).user;
            // The service will throw ForbiddenError if not authorized, but we also check existence inside service.
            // Since `getOneUserById` checks admin, we might need a separate method for existence check or pass currentUser.
            const isExistsUser = await this.userService.getOneUserById(id as string);

            if (!isExistsUser) {
                const message: string = 'User not found';
                return resFailed(res, 404, message);
            }

            const { name, phoneNumber, email } = req.body;
            const data = { name, phoneNumber, email };
            const user = await this.userService.updateOneUserById(id as string, data);

            const message: string = 'Success update user by id';
            return resSuccess(res, 200, message, { user });
        } catch (error: any) {
            logger.error('UserController.updateUserById', error.message);
            return resFailed(res, error.statusCode || 500, error.message);
        }
    }

    @RequirePermission('user:delete:any')
    public async deleteUserById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const currentUser = (req as any).user;
            const isExistsUser = await this.userService.getOneUserById(id as string);

            if (!isExistsUser) {
                const message: string = 'User not found';
                return resFailed(res, 404, message);
            }

            await this.userService.deleteOneUserById(id as string);

            const message: string = 'Success delete user by id';
            return resSuccess(res, 200, message);
        } catch (error: any) {
            logger.error('UserController.deleteUserById', error.message);
            return resFailed(res, error.statusCode || 500, error.message);
        }
    }
}
