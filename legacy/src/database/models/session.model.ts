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
import { User } from './user.model.js';

@Table({ tableName: 'sessions', underscored: true })
export class Session extends Model {
    @PrimaryKey
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @Column(DataType.TEXT)
    declare refreshToken: string | null;

    @AllowNull(false)
    @Column(DataType.DATE)
    declare expiresAt: Date;

    @BelongsTo(() => User)
    declare user: User;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}
