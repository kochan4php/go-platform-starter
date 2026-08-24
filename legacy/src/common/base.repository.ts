import type { Attributes, FindOptions, Model, ModelCtor, WhereOptions } from 'sequelize';

export interface IBaseRepository<T extends Model> {
    findAll(filter?: WhereOptions<Attributes<T>>, options?: FindOptions<Attributes<T>>): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    findOne(filter: WhereOptions<Attributes<T>>): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T | null>;
    delete(id: string): Promise<number>;
    paginate(filter?: WhereOptions<Attributes<T>>, options?: PaginateOptions<T>): Promise<{ rows: T[]; total: number }>;
}

export type PaginateOptions<T extends Model> = {
    limit?: number;
    offset?: number;
} & Omit<FindOptions<Attributes<T>>, 'limit' | 'offset'>;

export abstract class BaseRepository<T extends Model> implements IBaseRepository<T> {
    constructor(protected readonly model: ModelCtor<T>) {}

    public findAll(filter: WhereOptions<Attributes<T>> = {}, options: FindOptions<Attributes<T>> = {}): Promise<T[]> {
        return this.model.findAll({ where: filter, ...options });
    }

    public findById(id: string): Promise<T | null> {
        return this.model.findByPk(id);
    }

    public findOne(filter: WhereOptions<Attributes<T>>): Promise<T | null> {
        return this.model.findOne({ where: filter });
    }

    public create(data: any): Promise<T> {
        return this.model.create(data);
    }

    public async update(id: string, data: any): Promise<T | null> {
        const instance = await this.model.findByPk(id);
        if (!instance) return null;
        return instance.update(data);
    }

    public delete(id: string): Promise<number> {
        return this.model.destroy({ where: { id } as any });
    }

    /** Counted page fetch — the single source of every list endpoint's `{items, meta}` envelope. */
    public async paginate(
        filter: WhereOptions<Attributes<T>> = {},
        options: PaginateOptions<T> = {},
    ): Promise<{ rows: T[]; total: number }> {
        const { limit = 10, offset = 0, ...findOptions } = options;
        const { rows, count } = await this.model.findAndCountAll({
            where: filter,
            limit,
            offset,
            ...findOptions,
        });
        return { rows, total: count };
    }
}
