import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Authenticated } from '../../common/rbac/decorators.js';
import { resFailed, resSuccess } from '../../common/response.js';
import type DecodedUser from '../../common/types/decoded-user.js';
import type IRequest from '../../common/types/i-request.js';
import { UserService } from './users.service.js';

@injectable()
export class MeController {
    constructor(@inject(UserService) private readonly userService: UserService) {}

    @Authenticated()
    public async getMe(req: Request, res: Response): Promise<Response> {
        const tokenUser = (req as IRequest).user as DecodedUser;
        const user = await this.userService.getOneUserById(tokenUser.id);
        if (!user) {
            return resFailed(res, 404, 'User not found');
        }
        return resSuccess(res, 200, 'Success get current user', { user });
    }
}
