import type { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.addColumn('users', 'failed_login_attempts', {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 0,
    });
    await queryInterface.addColumn('users', 'locked_until', {
        type: 'TIMESTAMPTZ',
        allowNull: true,
    });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.removeColumn('users', 'locked_until');
    await queryInterface.removeColumn('users', 'failed_login_attempts');
}
