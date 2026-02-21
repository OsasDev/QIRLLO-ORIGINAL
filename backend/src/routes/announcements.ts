import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/announcements
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();
        const announcementId = uuidv4();

        const announcementDoc = {
            id: announcementId,
            school_id, // Link to school
            title: data.title,
            content: data.content,
            target_audience: data.target_audience,
            priority: data.priority || 'normal',
            author_id: currentUser.id,
            author_name: currentUser.full_name,
            created_at: nowISO(),
        };
        await db.collection('announcements').insertOne(announcementDoc);
        res.json(announcementDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/announcements
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        const db = getDB();

        const roleMap: Record<string, string> = { admin: 'all', teacher: 'teachers', parent: 'parents' };
        const userAudience = roleMap[currentUser.role] || 'all';

        const query = {
            school_id,
            $or: [{ target_audience: 'all' }, { target_audience: userAudience }]
        };
        const announcements = await db.collection('announcements')
            .find(query, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .limit(100)
            .toArray();

        res.json(announcements);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE /api/announcements/:announcementId
router.delete('/:announcementId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const result = await db.collection('announcements').deleteOne({ id: req.params.announcementId, school_id });
        if (result.deletedCount === 0) {
            res.status(404).json({ detail: 'Announcement not found or access denied' });
            return;
        }
        res.json({ message: 'Announcement deleted' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
