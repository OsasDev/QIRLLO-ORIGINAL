import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { calculateGrade, nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/grades
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id!;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const existing = await db.collection('grades').findOne({
            student_id: data.student_id,
            subject_id: data.subject_id,
            term: data.term,
            school_id, // Filter by school
            academic_year: data.academic_year || '2025/2026',
        });

        const totalScore = data.ca_score + data.exam_score;
        const gradeLetter = calculateGrade(totalScore);

        const student = await db.collection('students').findOne({ id: data.student_id, school_id }, { projection: { _id: 0 } });
        const subject = await db.collection('subjects').findOne({ id: data.subject_id, school_id }, { projection: { _id: 0 } });

        const gradeDoc = {
            id: existing ? existing.id : uuidv4(),
            school_id, // Link to school
            student_id: data.student_id,
            student_name: student ? student.full_name : null,
            subject_id: data.subject_id,
            subject_name: subject ? subject.name : null,
            ca_score: data.ca_score,
            exam_score: data.exam_score,
            total_score: totalScore,
            grade: gradeLetter,
            term: data.term,
            academic_year: data.academic_year || '2025/2026',
            comment: data.comment || null,
            status: 'draft',
            teacher_id: currentUser.id,
            created_at: nowISO(),
        };

        if (existing) {
            await db.collection('grades').updateOne({ id: existing.id, school_id }, { $set: gradeDoc });
        } else {
            await db.collection('grades').insertOne(gradeDoc);
        }

        res.json(gradeDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/grades/bulk
router.post('/bulk', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id!;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const { subject_id, term, academic_year = '2025/2026', grades } = req.body;
        const db = getDB();
        const subject = await db.collection('subjects').findOne({ id: subject_id, school_id }, { projection: { _id: 0 } });
        const results: any[] = [];

        for (const grade of grades) {
            const totalScore = grade.ca_score + grade.exam_score;
            const gradeLetter = calculateGrade(totalScore);
            const student = await db.collection('students').findOne({ id: grade.student_id, school_id }, { projection: { _id: 0 } });

            const existing = await db.collection('grades').findOne({
                student_id: grade.student_id,
                subject_id,
                term,
                school_id,
                academic_year,
            });

            const gradeDoc = {
                id: existing ? existing.id : uuidv4(),
                school_id,
                student_id: grade.student_id,
                student_name: student ? student.full_name : null,
                subject_id,
                subject_name: subject ? subject.name : null,
                ca_score: grade.ca_score,
                exam_score: grade.exam_score,
                total_score: totalScore,
                grade: gradeLetter,
                term,
                academic_year,
                comment: grade.comment || null,
                status: 'draft',
                teacher_id: currentUser.id,
                created_at: nowISO(),
            };

            if (existing) {
                await db.collection('grades').updateOne({ id: existing.id, school_id }, { $set: gradeDoc });
            } else {
                await db.collection('grades').insertOne(gradeDoc);
            }

            results.push(gradeDoc);
        }

        res.json(results);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/grades
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        const db = getDB();

        const query: any = { school_id };
        if (req.query.student_id) query.student_id = req.query.student_id;
        if (req.query.subject_id) query.subject_id = req.query.subject_id;
        if (req.query.term) query.term = req.query.term;
        if (req.query.status) query.status = req.query.status;

        if (req.query.class_id) {
            const students = await db.collection('students')
                .find({ class_id: req.query.class_id as string, school_id }, { projection: { _id: 0 } })
                .toArray();
            const studentIds = students.map((s: any) => s.id);
            query.student_id = { $in: studentIds };
        }

        if (currentUser.role === 'parent') {
            const children = await db.collection('students')
                .find({ parent_id: currentUser.id, school_id }, { projection: { _id: 0 } })
                .toArray();
            const childIds = children.map((c: any) => c.id);
            query.student_id = { $in: childIds };
            query.status = 'approved';
        }

        const grades = await db.collection('grades')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        res.json(grades);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/grades/:gradeId/submit
router.put('/:gradeId/submit', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const db = getDB();
        const result = await db.collection('grades').updateOne(
            { id: req.params.gradeId, school_id },
            { $set: { status: 'submitted' } }
        );
        if (result.matchedCount === 0) {
            res.status(404).json({ detail: 'Grade not found or access denied' });
            return;
        }
        res.json({ message: 'Grade submitted for approval' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/grades/submit-bulk
router.put('/submit-bulk', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        if (!['admin', 'teacher'].includes(currentUser.role)) {
            res.status(403).json({ detail: 'Access denied' });
            return;
        }

        const { subject_id, term } = req.query;
        const db = getDB();
        await db.collection('grades').updateMany(
            { subject_id: subject_id as string, term: term as string, status: 'draft', school_id },
            { $set: { status: 'submitted' } }
        );
        res.json({ message: 'Grades submitted for approval' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/grades/:gradeId/approve
router.put('/:gradeId/approve', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const result = await db.collection('grades').updateOne(
            { id: req.params.gradeId, school_id },
            { $set: { status: 'approved' } }
        );
        if (result.matchedCount === 0) {
            res.status(404).json({ detail: 'Grade not found or access denied' });
            return;
        }
        res.json({ message: 'Grade approved' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/grades/approve-bulk
router.put('/approve-bulk', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const query: any = { status: 'submitted', school_id };

        if (req.query.subject_id) query.subject_id = req.query.subject_id;
        if (req.query.term) query.term = req.query.term;

        if (req.query.class_id) {
            const students = await db.collection('students')
                .find({ class_id: req.query.class_id as string, school_id }, { projection: { _id: 0 } })
                .toArray();
            const studentIds = students.map((s: any) => s.id);
            query.student_id = { $in: studentIds };
        }

        const result = await db.collection('grades').updateMany(query, { $set: { status: 'approved' } });
        res.json({ message: `${result.modifiedCount} grades approved` });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
