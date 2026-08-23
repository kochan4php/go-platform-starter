import { injectable } from 'tsyringe';
import { prisma } from '../../database/connection.js';

@injectable()
export class AuthorizationService {
    public async getPermissions(userId: string): Promise<string[]> {
        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        const permissions = new Set<string>();
        for (const ur of userRoles) {
            for (const rp of ur.role.rolePermissions) {
                permissions.add(rp.permission.name);
            }
        }

        return Array.from(permissions);
    }
}
