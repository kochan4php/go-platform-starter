import { UUIDV4 } from 'sequelize';
import {
    AllowNull,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    Default,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';
import { Permission } from './permission.model.js';
import { Role } from './role.model.js';

@Table({
    tableName: 'role_permissions',
    underscored: true,
    indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
})
export class RolePermission extends Model {
    @PrimaryKey
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @ForeignKey(() => Role)
    @Column(DataType.UUID)
    declare roleId: string;

    @AllowNull(false)
    @ForeignKey(() => Permission)
    @Column(DataType.UUID)
    declare permissionId: string;

    @BelongsTo(() => Role)
    declare role: Role;

    @BelongsTo(() => Permission)
    declare permission: Permission;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
