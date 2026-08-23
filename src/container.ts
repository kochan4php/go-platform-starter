import { container } from 'tsyringe';
import { UserRepository } from './modules/users/users.repository';
import { SessionRepository } from './modules/auth/session.repository';
import { Gate } from './common/authorization/gate';
import { JwtAuthGuard } from './common/authorization/guards/jwt-auth.guard';
import { UserService } from './modules/users/users.service';
import { SessionService } from './modules/auth/session.service';
import { UserController } from './modules/users/users.controller';
import { AuthController } from './modules/auth/auth.controller';

// Register Repositories and Common Singletons
container.registerSingleton('IUserRepository', UserRepository);
container.registerSingleton('ISessionRepository', SessionRepository);
container.registerSingleton(Gate);
container.registerSingleton('IAuthGuard', JwtAuthGuard);

import { registerAbilities } from './common/authorization/abilities';
registerAbilities();

// Services and Controllers can be auto-resolved by tsyringe
// as long as they are decorated with @injectable()

export { container };
