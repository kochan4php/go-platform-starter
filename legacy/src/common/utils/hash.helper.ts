import bcrypt from 'bcrypt';

export class HashHelper {
    public static async hash(password: string, salt: number = 10): Promise<string> {
        return await bcrypt.hash(password, salt);
    }

    public static async compare(password: string, hashPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashPassword);
    }
}
