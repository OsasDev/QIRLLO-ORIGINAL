import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/school/settings
router.get('/settings', async (_req: Request, res: Response) => {
    try {
        const db = getDB();
        let settings = await db.collection('school_settings').findOne(
            {},
            { projection: { _id: 0 } }
        );

        if (!settings) {
            // Return defaults if no settings exist
            res.json({
                id: 'default',
                school_name: 'QIRLLO School',
                school_logo: null,
                address: null,
                phone: null,
                email: null,
                motto: null,
                updated_at: nowISO(),
            });
            return;
        }

        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/school/settings
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();
        const school_id = (req as AuthRequest).school_id;

        const updateData: any = {
            updated_at: nowISO(),
        };

        if (data.school_name !== undefined) updateData.school_name = data.school_name;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.motto !== undefined) updateData.motto = data.motto;

        await db.collection('school_settings').updateOne(
            { id: school_id },
            { $set: updateData }
        );

        const settings = await db.collection('school_settings').findOne(
            { id: school_id },
            { projection: { _id: 0 } }
        );

        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/school/logo
router.post('/logo', authMiddleware, upload.single('logo'), async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ detail: 'Logo file is required' });
            return;
        }

        // Store logo as base64 data URL
        const mimeType = req.file.mimetype;
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const db = getDB();
        const school_id = (req as AuthRequest).school_id;

        await db.collection('school_settings').updateOne(
            { id: school_id },
            {
                $set: {
                    school_logo: dataUrl,
                    updated_at: nowISO(),
                },
            }
        );

        const settings = await db.collection('school_settings').findOne(
            { id: school_id },
            { projection: { _id: 0 } }
        );

        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/school/onboarding-status
router.get('/onboarding-status', async (_req: Request, res: Response) => {
    try {
        const db = getDB();
        const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
        const settings = await db.collection('school_settings').findOne({}, { projection: { _id: 0 } });

        const isOnboarded = adminCount > 0 && settings !== null && settings.school_name !== 'QIRLLO School';

        res.json({ is_onboarded: isOnboarded });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/school/setup — save school settings (no auth required for first-time onboarding)
router.post('/setup', async (req: Request, res: Response) => {
    try {
        const db = getDB();

        const { school_name, motto, address, phone, email, school_logo } = req.body;
        if (!school_name) {
            res.status(400).json({ detail: 'School name is required' });
            return;
        }

        const school_id = uuidv4();

        await db.collection('school_settings').insertOne({
            id: school_id,
            school_name,
            motto: motto || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            school_logo: school_logo || null,
            updated_at: nowISO(),
        });

        const settings = await db.collection('school_settings').findOne({ id: school_id }, { projection: { _id: 0 } });
        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;

