import { container } from 'tsyringe';
import { createMailer } from './common/mailer/index.js';
import { JwtAuthGuard } from './common/rbac/guards/jwt-auth.guard.js';
import { SessionRepository } from './modules/auth/session.repository.js';
import { RoleRepository } from './modules/roles/roles.repository.js';
import { UserRepository } from './modules/users/users.repository.js';

// Repositories and guards registered under interface tokens
container.registerSingleton('IUserRepository', UserRepository);
container.registerSingleton('ISessionRepository', SessionRepository);
container.registerSingleton('IRoleRepository', RoleRepository);
container.registerSingleton('IAuthGuard', JwtAuthGuard);

// Mailer transport chosen once at boot (console | smtp)
container.registerInstance('IMailer', createMailer());

// Everything else (@injectable classes) is auto-resolved by tsyringe.
// IMPORTANT (tsx/esbuild): constructor injection requires an explicit @inject(Token)
// on every parameter — class-type auto-injection does not survive esbuild transforms.

export { container };
