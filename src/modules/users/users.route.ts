import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { container } from '../../container.js';
import { UserController } from './users.controller.js';
import { createUserSchema, getUsersSchema, updateUserSchema } from './users.dto.js';

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
