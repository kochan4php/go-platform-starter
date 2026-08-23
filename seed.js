Object.defineProperty(exports, '__esModule', { value: true });
const connection_1 = require('./src/database/connection');
async function main() {
    console.log('Seeding Database...');
    // 1. Create Roles
    const adminRole = await connection_1.prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin', description: 'Administrator' },
    });
    const userRole = await connection_1.prisma.role.upsert({
        where: { name: 'user' },
        update: {},
        create: { name: 'user', description: 'Standard User' },
    });
    // 2. Create Permissions
    const permissions = [
        'user:read:any',
        'user:read:own',
        'user:create:any',
        'user:update:any',
        'user:update:own',
        'user:delete:any',
        'user:delete:own',
        'role:view:any',
    ];
    for (const p of permissions) {
        await connection_1.prisma.permission.upsert({
            where: { name: p },
            update: {},
            create: { name: p, description: `Permission for ${p}` },
        });
    }
    // 3. Assign all permissions to admin
    const allPerms = await connection_1.prisma.permission.findMany();
    for (const p of allPerms) {
        await connection_1.prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: { roleId: adminRole.id, permissionId: p.id },
            },
            update: {},
            create: { roleId: adminRole.id, permissionId: p.id },
        });
    }
    // Assign read:own, update:own, delete:own to user
    const userPerms = allPerms.filter((p) => p.name.endsWith(':own'));
    for (const p of userPerms) {
        await connection_1.prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: { roleId: userRole.id, permissionId: p.id },
            },
            update: {},
            create: { roleId: userRole.id, permissionId: p.id },
        });
    }
    console.log('Seeding complete.');
}
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await connection_1.prisma.$disconnect();
    });
