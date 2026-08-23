import { UserController } from './users.controller';
import { container } from '../../container';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, getUsersSchema } from './users.dto';
import { BaseRoute } from '../../common/base.route';

import { injectable } from 'tsyringe';

@injectable()
export class UserRoute extends BaseRoute {
    private userController: UserController;
    private authGuard: any;

    constructor() {
        super('/api/admin/users');
        this.userController = container.resolve(UserController);
        this.authGuard = container.resolve('IAuthGuard');
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/', [validate(getUsersSchema)], this.userController, 'getAllUsers');
        this.get('/:id', [], this.userController, 'getUserById');
        this.post('/', [validate(createUserSchema)], this.userController, 'createUser');
        this.put('/:id', [validate(updateUserSchema)], this.userController, 'updateUserById');
        this.delete('/:id', [], this.userController, 'deleteUserById');
    }
}
