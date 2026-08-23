Object.defineProperty(exports, '__esModule', { value: true });
const pg_1 = require('pg');
const dbUrl = 'postgresql://dev:dev@localhost:5432/expressts';
async function checkDatabase() {
    const client = new pg_1.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log('Connected to DB directly!');
        // 1. Roles
        const resRoles = await client.query('SELECT * FROM "roles"');
        console.log(`\nFound ${resRoles.rowCount} Roles.`);
        for (const row of resRoles.rows) console.log(`- ${row.name}`);
        // 2. Permissions
        const resPerms = await client.query('SELECT * FROM "permissions"');
        console.log(`\nFound ${resPerms.rowCount} Permissions.`);
        for (const row of resPerms.rows) console.log(`- ${row.name}`);
        // 3. Mapping
        const resMapping = await client.query(`
            SELECT r.name as role, p.name as permission 
            FROM "role_permissions" rp
            JOIN "roles" r ON rp."roleId" = r._id
            JOIN "permissions" p ON rp."permissionId" = p._id
        `);
        console.log(`\nFound ${resMapping.rowCount} Role-Permission Mappings.`);
        for (const row of resMapping.rows) console.log(`- Role: ${row.role} -> Permission: ${row.permission}`);
        // 4. User Roles
        const resUsers = await client.query(`
            SELECT u.email, r.name as role
            FROM "users" u
            JOIN "user_roles" ur ON u._id = ur."userId"
            JOIN "roles" r ON ur."roleId" = r._id
        `);
        console.log(`\nFound ${resUsers.rowCount} User-Role Mappings.`);
        for (const row of resUsers.rows) console.log(`- User: ${row.email} -> Role: ${row.role}`);
    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        await client.end();
    }
}
checkDatabase();
