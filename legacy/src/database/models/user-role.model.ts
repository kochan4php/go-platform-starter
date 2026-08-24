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
import { Role } from './role.model.js';
import { User } from './user.model.js';

@Table({
    tableName: 'user_roles',
    underscored: true,
    indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
})
export class UserRole extends Model {
    @PrimaryKey
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @AllowNull(false)
    @ForeignKey(() => Role)
    @Column(DataType.UUID)
    declare roleId: string;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsTo(() => Role)
    declare role: Role;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
