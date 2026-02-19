import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { hashPassword, nowISO, generateDummyPassword } from '../helpers';
import { AuthRequest } from '../types';
import multer from 'multer';
import * as XLSX from 'xlsx';

const upload = multer({ storage: multer.memoryStorage() });

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

// GET /api/classes/xlsx-template  (must be before /:classId to avoid being shadowed)
router.get('/xlsx-template', async (_req: Request, res: Response) => {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Classes
        const classesData = [
            { name: 'JSS1 A', level: 'JSS1', section: 'A', academic_year: '2025/2026' },
            { name: 'JSS1 B', level: 'JSS1', section: 'B', academic_year: '2025/2026' },
        ];
        const wsClasses = XLSX.utils.json_to_sheet(classesData);
        XLSX.utils.book_append_sheet(wb, wsClasses, "Classes");

        // Sheet 2: Fees
        const feesData = [
            { class_level: 'JSS1', amount: 50000, description: 'Tuition Fee' },
            { class_level: 'JSS1', amount: 5000, description: 'Exam Fee' },
            { class_level: 'SS1', amount: 60000, description: 'Tuition Fee' },
        ];
        const wsFees = XLSX.utils.json_to_sheet(feesData);
        XLSX.utils.book_append_sheet(wb, wsFees, "Fees");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="classes_fees_template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
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

// POST /api/classes/:classId/assign-teacher
router.post('/:classId/assign-teacher', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const { email, full_name, phone } = req.body;
        if (!email || !full_name) {
            res.status(400).json({ detail: 'Email and full_name are required' });
            return;
        }

        const db = getDB();
        const classDoc = await db.collection('classes').findOne(
            { id: req.params.classId },
            { projection: { _id: 0 } }
        );
        if (!classDoc) {
            res.status(404).json({ detail: 'Class not found' });
            return;
        }

        let teacherId: string;
        let teacherCredentials: any = null;

        // Check if teacher already exists
        const existingTeacher = await db.collection('users').findOne(
            { email, role: 'teacher' },
            { projection: { _id: 0 } }
        );

        if (existingTeacher) {
            teacherId = existingTeacher.id;
        } else {
            // Auto-create teacher account with dummy password
            const dummyPassword = generateDummyPassword();
            teacherId = uuidv4();
            const teacherDoc = {
                id: teacherId,
                email,
                password_hash: hashPassword(dummyPassword),
                full_name,
                role: 'teacher',
                phone: phone || null,
                must_change_password: true,
                created_at: nowISO(),
            };
            await db.collection('users').insertOne(teacherDoc);
            teacherCredentials = { email, password: dummyPassword };
        }

        // Assign teacher to class
        await db.collection('classes').updateOne(
            { id: req.params.classId },
            { $set: { teacher_id: teacherId, teacher_name: full_name } }
        );

        const updatedClass = await db.collection('classes').findOne(
            { id: req.params.classId },
            { projection: { _id: 0 } }
        );

        const response: any = {
            message: existingTeacher
                ? `Teacher ${full_name} assigned to ${classDoc.name}`
                : `Teacher account created and assigned to ${classDoc.name}`,
            class: updatedClass,
        };

        if (teacherCredentials) {
            response.teacher_credentials = teacherCredentials;
            response.teacher_must_change_password = true;
        }

        res.json(response);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});



// POST /api/classes/upload-xlsx
router.post('/upload-xlsx', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ detail: 'No file uploaded' });
            return;
        }

        const db = getDB();
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });

        // Parse Classes Sheet
        const classesSheet = wb.Sheets["Classes"];
        let classesCreated = 0;
        let feesCreated = 0;
        const errors: string[] = [];

        if (classesSheet) {
            const classesData = XLSX.utils.sheet_to_json(classesSheet);
            for (const row of classesData as any[]) {
                try {
                    const name = (row.name || '').trim();
                    const level = (row.level || '').trim();
                    if (!name || !level) continue;

                    // Check if class exists
                    const existing = await db.collection('classes').findOne({ name });
                    if (!existing) {
                        const classDoc = {
                            id: uuidv4(),
                            name,
                            level,
                            section: row.section || '',
                            teacher_id: null,
                            teacher_name: null,
                            academic_year: row.academic_year || '2025/2026',
                            student_count: 0,
                            created_at: nowISO(),
                        };
                        await db.collection('classes').insertOne(classDoc);
                        classesCreated++;
                    }
                } catch (e: any) {
                    errors.push(`Class Error: ${e.message}`);
                }
            }
        }

        // Parse Fees Sheet
        const feesSheet = wb.Sheets["Fees"];
        if (feesSheet) {
            const feesData = XLSX.utils.sheet_to_json(feesSheet);
            for (const row of feesData as any[]) {
                try {
                    const level = (row.class_level || '').trim();
                    const amount = Number(row.amount);
                    if (!level || isNaN(amount)) continue;

                    const feeDoc = {
                        id: uuidv4(),
                        class_level: level,
                        amount,
                        description: row.description || 'School Fees',
                        created_at: nowISO(),
                    };
                    await db.collection('fee_structures').insertOne(feeDoc);
                    feesCreated++;
                } catch (e: any) {
                    errors.push(`Fee Error: ${e.message}`);
                }
            }
        }

        res.json({
            message: `Processed upload`,
            classes_created: classesCreated,
            fees_created: feesCreated,
            errors
        });

    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;

