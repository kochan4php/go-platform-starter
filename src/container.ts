import { container } from 'tsyringe';
import { JwtAuthGuard } from './common/rbac/guards/jwt-auth.guard.js';
import { PermissionMiddleware } from './common/rbac/permission.middleware.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { SessionRepository } from './modules/auth/session.repository.js';
import { SessionService } from './modules/auth/session.service.js';
import { UserController } from './modules/users/users.controller.js';
import { UserRepository } from './modules/users/users.repository.js';
import { UserService } from './modules/users/users.service.js';

// Repositories and guards registered under interface tokens
container.registerSingleton('IUserRepository', UserRepository);
container.registerSingleton('ISessionRepository', SessionRepository);
container.registerSingleton('IAuthGuard', JwtAuthGuard);

// Everything else (@injectable classes) is auto-resolved by tsyringe.
// IMPORTANT (tsx/esbuild): constructor injection requires an explicit @inject(Token)
// on every parameter — class-type auto-injection does not survive esbuild transforms.

export { container };
