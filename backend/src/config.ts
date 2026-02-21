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

// SMTP Config
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@qirllo.com';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'https://qirllo-frontend.onrender.com'; // Default to production

// Diagnostic Logging
console.log('--- Environment Configuration ---');
console.log('PORT:', PORT);
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('SMTP_HOST:', SMTP_HOST || '(not set)');
console.log('SMTP_USER:', SMTP_USER || '(not set)');
console.log('SMTP_PASS:', SMTP_PASS ? '********' : '(not set)');
console.log('---------------------------------');
