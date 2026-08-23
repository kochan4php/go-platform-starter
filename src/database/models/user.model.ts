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
import { Session } from './session.model.js';
import { UserRole } from './user-role.model.js';

@Table({ tableName: 'users', underscored: true })
export class User extends Model {
    @PrimaryKey
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    declare name: string;

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    declare phoneNumber: string;

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    declare email: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    declare password: string;

    @Column(DataType.TEXT)
    declare avatar: string | null;

    @Column(DataType.TEXT)
    declare bio: string | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @HasMany(() => Session)
    declare sessions: Session[];

    @HasMany(() => UserRole)
    declare userRoles: UserRole[];
}
