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

@Table({ tableName: 'permissions', underscored: true })
export class Permission extends Model {
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
}
