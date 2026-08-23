import { UUIDV4 } from 'sequelize';
import { AllowNull, Column, CreatedAt, DataType, Default, Model, PrimaryKey, Table, Unique, UpdatedAt } from 'sequelize-typescript';

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
}
