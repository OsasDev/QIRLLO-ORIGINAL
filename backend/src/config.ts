import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const MONGO_URL = process.env.MONGO_URL || '';
export const DB_NAME = process.env.DB_NAME || 'qirllo';
export const JWT_SECRET = process.env.JWT_SECRET || 'qirllo-secret-key-2026';
export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRATION_HOURS = 24;
export const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';
export const PORT = process.env.PORT || 8001;
