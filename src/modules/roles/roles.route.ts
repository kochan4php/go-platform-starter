import { injectable } from 'tsyringe';
import { BaseRoute } from '../../common/base.route.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { container } from '../../container.js';
import { openApiRegistry } from '../../openapi/registry.js';
import { RoleController } from './roles.controller.js';
import { createRoleSchema, getRolesSchema, replacePermissionsSchema, roleIdSchema, updateRoleSchema } from './roles.dto.js';

@injectable()
export class RoleRoute extends BaseRoute {
    private roleController: RoleController;

    constructor() {
        super('/api/v1/roles');
        this.roleController = container.resolve(RoleController);
        this.initializeRoutes();
    }

    protected initializeRoutes(): void {
        openApiRegistry.register({
            path: '/api/v1/roles',
            method: 'get',
            tag: 'Roles',
            summary: 'List roles (paginated)',
            security: 'bearer',
            query: getRolesSchema.shape.query,
        });
        openApiRegistry.register({
            path: '/api/v1/roles/{id}',
            method: 'get',
            tag: 'Roles',
            summary: 'Get role by id',
            security: 'bearer',
            params: roleIdSchema.shape.params,
        });
        openApiRegistry.register({
            path: '/api/v1/roles/{id}/permissions',
            method: 'get',
            tag: 'Roles',
            summary: "List a role's permissions",
            security: 'bearer',
            params: roleIdSchema.shape.params,
        });
        openApiRegistry.register({
            path: '/api/v1/roles',
            method: 'post',
            tag: 'Roles',
            summary: 'Create a role',
            security: 'bearer',
            body: createRoleSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/roles/{id}',
            method: 'put',
            tag: 'Roles',
            summary: 'Update role by id',
            security: 'bearer',
            params: roleIdSchema.shape.params,
            body: updateRoleSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/roles/{id}/permissions',
            method: 'put',
            tag: 'Roles',
            summary: "Replace a role's permissions",
            security: 'bearer',
            params: replacePermissionsSchema.shape.params,
            body: replacePermissionsSchema.shape.body,
        });
        openApiRegistry.register({
            path: '/api/v1/roles/{id}',
            method: 'delete',
            tag: 'Roles',
            summary: 'Delete role by id',
            security: 'bearer',
            params: roleIdSchema.shape.params,
        });

        this.get('/', [validate(getRolesSchema)], this.roleController, 'getAllRoles');
        this.get('/:id', [validate(roleIdSchema)], this.roleController, 'getRoleById');
        this.get('/:id/permissions', [validate(roleIdSchema)], this.roleController, 'getRolePermissions');
        this.post('/', [validate(createRoleSchema)], this.roleController, 'createRole');
        this.put('/:id', [validate(updateRoleSchema), validate(roleIdSchema)], this.roleController, 'updateRoleById');
        this.put(
            '/:id/permissions',
            [validate(replacePermissionsSchema), validate(roleIdSchema)],
            this.roleController,
            'replaceRolePermissions',
        );
        this.delete('/:id', [validate(roleIdSchema)], this.roleController, 'deleteRoleById');
    }
}
