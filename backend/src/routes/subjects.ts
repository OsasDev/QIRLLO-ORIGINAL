import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/subjects
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();
        const subjectId = uuidv4();

        const classDoc = await db.collection('classes').findOne({ id: data.class_id }, { projection: { _id: 0 } });
        let teacherName: string | null = null;
        if (data.teacher_id) {
            const teacher = await db.collection('users').findOne({ id: data.teacher_id }, { projection: { _id: 0 } });
            teacherName = teacher ? teacher.full_name : null;
        }

        const subjectDoc = {
            id: subjectId,
            name: data.name,
            code: data.code,
            class_id: data.class_id,
            class_name: classDoc ? classDoc.name : null,
            teacher_id: data.teacher_id || null,
            teacher_name: teacherName,
            created_at: nowISO(),
        };
        await db.collection('subjects').insertOne(subjectDoc);
        res.json(subjectDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/subjects
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        const query: any = {};
        if (req.query.class_id) query.class_id = req.query.class_id;
        if (req.query.teacher_id) query.teacher_id = req.query.teacher_id;
        if (currentUser.role === 'teacher') query.teacher_id = currentUser.id;

        const subjects = await db.collection('subjects')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        res.json(subjects);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/subjects/:subjectId
router.put('/:subjectId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const classDoc = await db.collection('classes').findOne({ id: data.class_id }, { projection: { _id: 0 } });
        let teacherName: string | null = null;
        if (data.teacher_id) {
            const teacher = await db.collection('users').findOne({ id: data.teacher_id }, { projection: { _id: 0 } });
            teacherName = teacher ? teacher.full_name : null;
        }

        const updateData = { ...data, class_name: classDoc ? classDoc.name : null, teacher_name: teacherName };
        await db.collection('subjects').updateOne(
            { id: req.params.subjectId },
            { $set: updateData }
        );

        const subject = await db.collection('subjects').findOne(
            { id: req.params.subjectId },
            { projection: { _id: 0 } }
        );
        res.json(subject);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE /api/subjects/:subjectId
router.delete('/:subjectId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const result = await db.collection('subjects').deleteOne({ id: req.params.subjectId });
        if (result.deletedCount === 0) {
            res.status(404).json({ detail: 'Subject not found' });
            return;
        }
        res.json({ message: 'Subject deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
