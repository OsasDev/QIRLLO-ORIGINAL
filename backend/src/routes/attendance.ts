import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/attendance
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const student = await db.collection('students').findOne({ id: data.student_id }, { projection: { _id: 0 } });
        if (!student) {
            res.status(404).json({ detail: 'Student not found' });
            return;
        }

        const existing = await db.collection('attendance').findOne({
            student_id: data.student_id,
            date: data.date,
        });

        const attendanceId = existing ? existing.id : uuidv4();
        const attendanceDoc = {
            id: attendanceId,
            student_id: data.student_id,
            student_name: student.full_name,
            class_id: student.class_id,
            class_name: student.class_name || null,
            date: data.date,
            status: data.status,
            notes: data.notes || null,
            marked_by: currentUser.id,
            created_at: nowISO(),
        };

        if (existing) {
            await db.collection('attendance').updateOne({ id: existing.id }, { $set: attendanceDoc });
        } else {
            await db.collection('attendance').insertOne(attendanceDoc);
        }

        res.json(attendanceDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/attendance/bulk
router.post('/bulk', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const { class_id, date, records } = req.body;
        const db = getDB();
        const classDoc = await db.collection('classes').findOne({ id: class_id }, { projection: { _id: 0 } });
        const results: any[] = [];

        for (const record of records) {
            const student = await db.collection('students').findOne({ id: record.student_id }, { projection: { _id: 0 } });
            if (!student) continue;

            const existing = await db.collection('attendance').findOne({
                student_id: record.student_id,
                date,
            });

            const attendanceId = existing ? existing.id : uuidv4();
            const attendanceDoc = {
                id: attendanceId,
                student_id: record.student_id,
                student_name: student.full_name,
                class_id,
                class_name: classDoc ? classDoc.name : null,
                date,
                status: record.status,
                notes: record.notes || null,
                marked_by: currentUser.id,
                created_at: nowISO(),
            };

            if (existing) {
                await db.collection('attendance').updateOne({ id: existing.id }, { $set: attendanceDoc });
            } else {
                await db.collection('attendance').insertOne(attendanceDoc);
            }

            results.push(attendanceDoc);
        }

        res.json(results);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/attendance
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        const query: any = {};
        if (req.query.class_id) query.class_id = req.query.class_id;
        if (req.query.student_id) query.student_id = req.query.student_id;
        if (req.query.date) query.date = req.query.date;
        if (req.query.start_date && req.query.end_date) {
            query.date = { $gte: req.query.start_date as string, $lte: req.query.end_date as string };
        }

        if (currentUser.role === 'parent') {
            const children = await db.collection('students')
                .find({ parent_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const childIds = children.map((c: any) => c.id);
            query.student_id = { $in: childIds };
        }

        if (currentUser.role === 'teacher') {
            const subjects = await db.collection('subjects')
                .find({ teacher_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const classIds = [...new Set(subjects.map((s: any) => s.class_id))];
            if (!req.query.class_id) {
                query.class_id = { $in: classIds };
            }
        }

        const attendance = await db.collection('attendance')
            .find(query, { projection: { _id: 0 } })
            .sort({ date: -1 })
            .toArray();

        res.json(attendance);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/attendance/summary/:studentId
router.get('/summary/:studentId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        const student = await db.collection('students').findOne(
            { id: req.params.studentId },
            { projection: { _id: 0 } }
        );
        if (!student) {
            res.status(404).json({ detail: 'Student not found' });
            return;
        }

        if (currentUser.role === 'parent' && student.parent_id !== currentUser.id) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const attendance = await db.collection('attendance')
            .find({ student_id: req.params.studentId }, { projection: { _id: 0 } })
            .toArray();

        const totalDays = attendance.length;
        const present = attendance.filter((a: any) => a.status === 'present').length;
        const absent = attendance.filter((a: any) => a.status === 'absent').length;
        const late = attendance.filter((a: any) => a.status === 'late').length;
        const excused = attendance.filter((a: any) => a.status === 'excused').length;
        const attendanceRate = totalDays > 0 ? Math.round(((present + late) / totalDays) * 1000) / 10 : 0;

        res.json({
            student_id: req.params.studentId,
            student_name: student.full_name,
            class_name: student.class_name || null,
            total_days: totalDays,
            present,
            absent,
            late,
            excused,
            attendance_rate: attendanceRate,
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
