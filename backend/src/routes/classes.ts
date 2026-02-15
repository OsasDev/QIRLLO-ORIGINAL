import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/classes
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();
        const classId = uuidv4();

        let teacherName: string | null = null;
        if (data.teacher_id) {
            const teacher = await db.collection('users').findOne({ id: data.teacher_id }, { projection: { _id: 0 } });
            teacherName = teacher ? teacher.full_name : null;
        }

        const classDoc = {
            id: classId,
            name: data.name,
            level: data.level,
            section: data.section || 'A',
            teacher_id: data.teacher_id || null,
            teacher_name: teacherName,
            academic_year: data.academic_year || '2025/2026',
            student_count: 0,
            created_at: nowISO(),
        };
        await db.collection('classes').insertOne(classDoc);
        res.json(classDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/classes
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        let query: any = {};
        if (req.query.teacher_id) query.teacher_id = req.query.teacher_id;

        if (currentUser.role === 'teacher') {
            const subjects = await db.collection('subjects')
                .find({ teacher_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const classIds = [...new Set(subjects.map((s: any) => s.class_id))];
            query = { $or: [{ teacher_id: currentUser.id }, { id: { $in: classIds } }] };
        }

        const classes = await db.collection('classes')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        for (const cls of classes) {
            const count = await db.collection('students').countDocuments({ class_id: cls.id });
            cls.student_count = count;
        }

        res.json(classes);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/classes/:classId
router.get('/:classId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const cls = await db.collection('classes').findOne(
            { id: req.params.classId },
            { projection: { _id: 0 } }
        );
        if (!cls) {
            res.status(404).json({ detail: 'Class not found' });
            return;
        }

        const count = await db.collection('students').countDocuments({ class_id: req.params.classId });
        cls.student_count = count;
        res.json(cls);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/classes/:classId
router.put('/:classId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();

        let teacherName: string | null = null;
        if (data.teacher_id) {
            const teacher = await db.collection('users').findOne({ id: data.teacher_id }, { projection: { _id: 0 } });
            teacherName = teacher ? teacher.full_name : null;
        }

        const updateData = { ...data, teacher_name: teacherName };
        await db.collection('classes').updateOne(
            { id: req.params.classId },
            { $set: updateData }
        );

        const cls = await db.collection('classes').findOne(
            { id: req.params.classId },
            { projection: { _id: 0 } }
        );
        if (cls) {
            const count = await db.collection('students').countDocuments({ class_id: req.params.classId });
            cls.student_count = count;
        }
        res.json(cls);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE /api/classes/:classId
router.delete('/:classId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const result = await db.collection('classes').deleteOne({ id: req.params.classId });
        if (result.deletedCount === 0) {
            res.status(404).json({ detail: 'Class not found' });
            return;
        }
        res.json({ message: 'Class deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
