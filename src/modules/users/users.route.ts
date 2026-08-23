import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { container } from '../../container.js';
import { MeController } from './me.controller.js';
import { UserController } from './users.controller.js';
import { createUserSchema, getUsersSchema, updateUserSchema, userIdSchema } from './users.dto.js';

@injectable()
export class UserRoute extends BaseRoute {
    private userController: UserController;
    private meController: MeController;

    constructor() {
        super('/api/v1/users');
        this.userController = container.resolve(UserController);
        this.meController = container.resolve(MeController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        this.get('/me', [], this.meController, 'getMe');
        this.get('/', [validate(getUsersSchema)], this.userController, 'getAllUsers');
        this.get('/:id', [validate(userIdSchema)], this.userController, 'getUserById');
        this.post('/', [validate(createUserSchema)], this.userController, 'createUser');
        this.put('/:id', [validate(updateUserSchema), validate(userIdSchema)], this.userController, 'updateUserById');
        this.delete('/:id', [validate(userIdSchema)], this.userController, 'deleteUserById');
    }
}
