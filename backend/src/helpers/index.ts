import bcrypt from 'bcryptjs';

export function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hashed: string): boolean {
    return bcrypt.compareSync(password, hashed);
}

export function calculateGrade(total: number): string {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 45) return 'D';
    if (total >= 40) return 'E';
    return 'F';
}

export function nowISO(): string {
    return new Date().toISOString();
}

export function todayDateString(): string {
    return new Date().toISOString().split('T')[0];
}

export function generateDummyPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
export * from './email';
