import type { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('users', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        name: { type: 'STRING', allowNull: false },
        phone_number: { type: 'STRING', allowNull: false, unique: true },
        email: { type: 'STRING', allowNull: false, unique: true },
        password: { type: 'STRING', allowNull: false },
        avatar: { type: 'TEXT' },
        bio: { type: 'TEXT' },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('roles', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        name: { type: 'STRING', allowNull: false, unique: true },
        description: { type: 'TEXT' },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('permissions', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        name: { type: 'STRING', allowNull: false, unique: true },
        description: { type: 'TEXT' },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('role_permissions', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        role_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'roles', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        permission_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'permissions', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('role_permissions', ['role_id', 'permission_id'], { unique: true });

    await queryInterface.createTable('user_roles', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        user_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        role_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'roles', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], { unique: true });

    await queryInterface.createTable('sessions', {
        id: { type: 'UUID', primaryKey: true, defaultValue: 'gen_random_uuid()' },
        user_id: {
            type: 'UUID',
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        refresh_token: { type: 'TEXT' },
        expires_at: { type: 'DATE', allowNull: false },
        created_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
        updated_at: { type: 'DATE', allowNull: false, defaultValue: queryInterface.sequelize.literal('NOW()') },
    });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('users');
}
