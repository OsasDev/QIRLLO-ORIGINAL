import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/students
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const existing = await db.collection('students').findOne({ admission_number: data.admission_number });
        if (existing) {
            res.status(400).json({ detail: 'Admission number already exists' });
            return;
        }

        const studentId = uuidv4();
        const classDoc = await db.collection('classes').findOne({ id: data.class_id }, { projection: { _id: 0 } });

        const studentDoc = {
            id: studentId,
            full_name: data.full_name,
            admission_number: data.admission_number,
            class_id: data.class_id,
            class_name: classDoc ? classDoc.name : null,
            gender: data.gender,
            date_of_birth: data.date_of_birth || null,
            parent_id: data.parent_id || null,
            address: data.address || null,
            created_at: nowISO(),
        };
        await db.collection('students').insertOne(studentDoc);
        res.json(studentDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/students
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        const query: any = {};
        if (req.query.class_id) query.class_id = req.query.class_id;
        if (req.query.parent_id) query.parent_id = req.query.parent_id;
        if (currentUser.role === 'parent') query.parent_id = currentUser.id;

        const students = await db.collection('students')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        res.json(students);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/students/csv-template
router.get('/csv-template', async (_req: Request, res: Response) => {
    const template = `full_name,admission_number,class,gender,date_of_birth,parent_email,address
John Doe,QRL/2025/0001,JSS1 A,male,2012-05-15,parent@email.com,123 Lagos Street
Jane Smith,QRL/2025/0002,JSS1 A,female,2012-08-20,parent2@email.com,456 Abuja Road`;

    res.json({
        template,
        fields: [
            { name: 'full_name', required: true, description: "Student's full name" },
            { name: 'admission_number', required: true, description: 'Unique admission number' },
            { name: 'class', required: false, description: 'Class name (e.g., JSS1 A)' },
            { name: 'gender', required: false, description: 'male or female' },
            { name: 'date_of_birth', required: false, description: 'YYYY-MM-DD format' },
            { name: 'parent_email', required: false, description: "Parent's registered email" },
            { name: 'address', required: false, description: "Student's address" },
        ],
    });
});

// GET /api/students/:studentId
router.get('/:studentId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const student = await db.collection('students').findOne(
            { id: req.params.studentId },
            { projection: { _id: 0 } }
        );
        if (!student) {
            res.status(404).json({ detail: 'Student not found' });
            return;
        }
        res.json(student);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// PUT /api/students/:studentId
router.put('/:studentId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const classDoc = await db.collection('classes').findOne({ id: data.class_id }, { projection: { _id: 0 } });
        const updateData = { ...data, class_name: classDoc ? classDoc.name : null };

        await db.collection('students').updateOne(
            { id: req.params.studentId },
            { $set: updateData }
        );

        const student = await db.collection('students').findOne(
            { id: req.params.studentId },
            { projection: { _id: 0 } }
        );
        res.json(student);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE /api/students/:studentId
router.delete('/:studentId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const result = await db.collection('students').deleteOne({ id: req.params.studentId });
        if (result.deletedCount === 0) {
            res.status(404).json({ detail: 'Student not found' });
            return;
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/students/upload-csv
router.post('/upload-csv', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        if (!req.file || !req.file.originalname.endsWith('.csv')) {
            res.status(400).json({ detail: 'File must be a CSV' });
            return;
        }

        const db = getDB();
        const rows: any[] = [];
        const stream = Readable.from(req.file.buffer.toString());

        await new Promise<void>((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row: any) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        let created = 0;
        const errors: string[] = [];
        const levels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const full_name = (row.full_name || '').trim();
                const admission_number = (row.admission_number || '').trim();
                const className = (row.class || '').trim();
                const gender = (row.gender || 'male').trim().toLowerCase();

                if (!full_name || !admission_number) {
                    errors.push(`Row ${rowNum}: Missing required fields (full_name or admission_number)`);
                    continue;
                }

                const existingStudent = await db.collection('students').findOne({ admission_number });
                if (existingStudent) {
                    errors.push(`Row ${rowNum}: Admission number ${admission_number} already exists`);
                    continue;
                }

                let classDoc = await db.collection('classes').findOne({ name: className }, { projection: { _id: 0 } });
                if (!classDoc) {
                    const levelMatch = levels.find(l => className.toUpperCase().includes(l));
                    if (levelMatch) {
                        classDoc = await db.collection('classes').findOne({ level: levelMatch }, { projection: { _id: 0 } });
                    }
                }

                const classId = classDoc ? classDoc.id : null;

                const parentEmail = (row.parent_email || '').trim();
                let parentId: string | null = null;
                if (parentEmail) {
                    const parent = await db.collection('users').findOne(
                        { email: parentEmail, role: 'parent' },
                        { projection: { _id: 0 } }
                    );
                    if (parent) parentId = parent.id;
                }

                const studentId = uuidv4();
                const studentDoc = {
                    id: studentId,
                    full_name,
                    admission_number,
                    class_id: classId,
                    class_name: classDoc ? classDoc.name : className,
                    gender: ['male', 'female'].includes(gender) ? gender : 'male',
                    date_of_birth: (row.date_of_birth || '').trim() || null,
                    parent_id: parentId,
                    address: (row.address || '').trim() || null,
                    created_at: nowISO(),
                };

                await db.collection('students').insertOne(studentDoc);
                created++;
            } catch (e: any) {
                errors.push(`Row ${rowNum}: ${e.message}`);
            }
        }

        res.json({ message: `Successfully created ${created} students`, created, errors });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
