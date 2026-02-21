import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET, JWT_EXPIRATION_HOURS } from '../config';
import { getDB } from '../db';
import { hashPassword, verifyPassword, nowISO } from '../helpers';
import { AuthRequest, UserCreate, UserLogin } from '../types';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const data: UserCreate = req.body;
        const db = getDB();

        const existing = await db.collection('users').findOne({ email: data.email });
        if (existing) {
            res.status(400).json({ detail: 'Email already registered' });
            return;
        }

        const userId = uuidv4();
        const schoolId = data.school_id || 'default'; // Fallback for initial registration
        const userDoc = {
            id: userId,
            email: data.email,
            password_hash: hashPassword(data.password),
            full_name: data.full_name,
            role: data.role,
            school_id: schoolId,
            phone: data.phone || null,
            created_at: nowISO(),
        };
        await db.collection('users').insertOne(userDoc);

        const token = jwt.sign(
            { sub: userId, role: data.role, school_id: schoolId },
            JWT_SECRET,
            { expiresIn: `${JWT_EXPIRATION_HOURS}h` }
        );

        res.json({
            access_token: token,
            token_type: 'bearer',
            user: {
                id: userId,
                email: data.email,
                full_name: data.full_name,
                role: data.role,
                school_id: schoolId,
                phone: data.phone || null,
                created_at: userDoc.created_at,
            },
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password }: UserLogin = req.body;
        const db = getDB();

        const user = await db.collection('users').findOne(
            { email },
            { projection: { _id: 0 } }
        );

        if (!user || !verifyPassword(password, user.password_hash)) {
            res.status(401).json({ detail: 'Invalid email or password' });
            return;
        }

        const token = jwt.sign(
            { sub: user.id, role: user.role, school_id: user.school_id },
            JWT_SECRET,
            { expiresIn: `${JWT_EXPIRATION_HOURS}h` }
        );

        res.json({
            access_token: token,
            token_type: 'bearer',
            must_change_password: user.must_change_password === true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                school_id: user.school_id,
                phone: user.phone || null,
                created_at: user.created_at,
            },
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    res.json({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        school_id: user.school_id,
        phone: user.phone || null,
        must_change_password: user.must_change_password === true,
        created_at: user.created_at,
    });
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            res.status(400).json({ detail: 'Both current_password and new_password are required' });
            return;
        }

        if (new_password.length < 6) {
            res.status(400).json({ detail: 'New password must be at least 6 characters' });
            return;
        }

        const db = getDB();
        const user = await db.collection('users').findOne({ id: currentUser.id });

        if (!user || !verifyPassword(current_password, user.password_hash)) {
            res.status(401).json({ detail: 'Current password is incorrect' });
            return;
        }

        await db.collection('users').updateOne(
            { id: currentUser.id },
            {
                $set: {
                    password_hash: hashPassword(new_password),
                    must_change_password: false,
                },
            }
        );

        res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
