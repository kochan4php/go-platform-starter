import { UUIDV4 } from 'sequelize';
import {
    AllowNull,
    Column,
    CreatedAt,
    DataType,
    Default,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    Unique,
    UpdatedAt,
} from 'sequelize-typescript';
import { RolePermission } from './role-permission.model.js';
import { UserRole } from './user-role.model.js';

@Table({ tableName: 'roles', underscored: true })
export class Role extends Model {
    @PrimaryKey
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string;

    @Column(DataType.TEXT)
    declare description: string | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @HasMany(() => RolePermission)
    declare rolePermissions: RolePermission[];

    @HasMany(() => UserRole)
    declare userRoles: UserRole[];
}
