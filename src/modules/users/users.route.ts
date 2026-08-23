import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { container } from '../../container.js';
import { openApiRegistry } from '../../openapi/registry.js';
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
        openApiRegistry.register({
            path: '/api/v1/users/me',
            method: 'get',
            tag: 'Users',
            summary: 'Current authenticated user',
            security: 'bearer',
        });
        openApiRegistry.register({
            path: '/api/v1/users',
            method: 'get',
            tag: 'Users',
            summary: 'List users (paginated)',
            security: 'bearer',
            query: getUsersSchema.shape.query,
        });
        openApiRegistry.register({
            path: '/api/v1/users/{id}',
            method: 'get',
            tag: 'Users',
            summary: 'Get user by id',
            security: 'bearer',
            params: userIdSchema.shape.params,
        });
        openApiRegistry.register({
            path: '/api/v1/users',
            method: 'post',
            tag: 'Users',
            summary: 'Create a user',
            security: 'bearer',
            body: createUserSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/users/{id}',
            method: 'put',
            tag: 'Users',
            summary: 'Update user by id',
            security: 'bearer',
            params: userIdSchema.shape.params,
            body: updateUserSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/users/{id}',
            method: 'delete',
            tag: 'Users',
            summary: 'Delete user by id',
            security: 'bearer',
            params: userIdSchema.shape.params,
        });

        this.get('/me', [], this.meController, 'getMe');
        this.get('/', [validate(getUsersSchema)], this.userController, 'getAllUsers');
        this.get('/:id', [validate(userIdSchema)], this.userController, 'getUserById');
        this.post('/', [validate(createUserSchema)], this.userController, 'createUser');
        this.put('/:id', [validate(updateUserSchema), validate(userIdSchema)], this.userController, 'updateUserById');
        this.delete('/:id', [validate(userIdSchema)], this.userController, 'deleteUserById');
    }
}
