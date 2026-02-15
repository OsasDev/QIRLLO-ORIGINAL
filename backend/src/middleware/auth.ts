import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { getDB } from '../db';
import { AuthRequest, JWTPayload } from '../types';

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ detail: 'Missing or invalid authorization header' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        const userId = payload.sub;

        const db = getDB();
        const user = await db.collection('users').findOne(
            { id: userId },
            { projection: { _id: 0 } }
        );

        if (!user) {
            res.status(401).json({ detail: 'User not found' });
            return;
        }

        (req as AuthRequest).user = user as any;
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ detail: 'Token expired' });
            return;
        }
        res.status(401).json({ detail: 'Invalid token' });
    }
}
