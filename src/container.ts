import { container } from 'tsyringe';
import { Gate } from './common/authorization/gate.js';
import { JwtAuthGuard } from './common/authorization/guards/jwt-auth.guard.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { SessionRepository } from './modules/auth/session.repository.js';
import { SessionService } from './modules/auth/session.service.js';
import { UserController } from './modules/users/users.controller.js';
import { UserRepository } from './modules/users/users.repository.js';
import { UserService } from './modules/users/users.service.js';

// Register Repositories and Common Singletons
container.registerSingleton('IUserRepository', UserRepository);
container.registerSingleton('ISessionRepository', SessionRepository);
container.registerSingleton(Gate);
container.registerSingleton('IAuthGuard', JwtAuthGuard);

import { registerAbilities } from './common/authorization/abilities.js';

registerAbilities();

// Services and Controllers can be auto-resolved by tsyringe
// as long as they are decorated with @injectable()

export { container };
