import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { hashPassword, nowISO, generateDummyPassword, sendInvitationEmail } from '../helpers';
import { AuthRequest } from '../types';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/users/invite
router.post('/invite', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const { full_name, email, role, phone } = req.body;
        if (!full_name || !email || !role) {
            res.status(400).json({ detail: 'Missing required fields' });
            return;
        }

        const db = getDB();
        const existing = await db.collection('users').findOne({ email });
        if (existing) {
            res.status(400).json({ detail: 'User with this email already exists' });
            return;
        }

        const password = generateDummyPassword();
        const userId = uuidv4();
        const userDoc = {
            id: userId,
            email,
            password_hash: hashPassword(password),
            full_name,
            role,
            phone: phone || null,
            must_change_password: true,
            created_at: nowISO(),
        };

        await db.collection('users').insertOne(userDoc);

        // Send invitation email
        const sent = await sendInvitationEmail(email, full_name, role, password);

        if (!sent) {
            // If email fails, we should probably warn the admin, but the user is created.
            // A real system might queue the email or rollback.
            res.status(201).json({
                ...userDoc,
                password_hash: undefined,
                warning: 'User created but failed to send email. Password is: ' + password
            });
            return;
        }

        res.status(201).json({
            ...userDoc,
            password_hash: undefined,
            message: 'User invited successfully'
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/users
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user!;
        if (user.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const role = req.query.role as string | undefined;
        const query: any = {};
        if (role) query.role = role;

        const users = await db.collection('users')
            .find(query, { projection: { _id: 0, password_hash: 0 } })
            .toArray();

        res.json(users);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/teachers
router.get('/teachers', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const db = getDB();
        const teachers = await db.collection('users')
            .find({ role: 'teacher' }, { projection: { _id: 0, password_hash: 0 } })
            .toArray();
        res.json(teachers);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/parents
router.get('/parents', authMiddleware, async (_req: Request, res: Response) => {
    try {
        const db = getDB();
        const parents = await db.collection('users')
            .find({ role: 'parent' }, { projection: { _id: 0, password_hash: 0 } })
            .toArray();
        res.json(parents);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE /api/users/:userId
router.delete('/:userId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const userId = req.params.userId;
        if (userId === currentUser.id) {
            res.status(400).json({ detail: 'Cannot delete your own account' });
            return;
        }

        const db = getDB();
        const result = await db.collection('users').deleteOne({ id: userId });
        if (result.deletedCount === 0) {
            res.status(404).json({ detail: 'User not found' });
            return;
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/users/parents-csv-template
router.get('/parents-csv-template', async (_req: Request, res: Response) => {
    const template = `full_name,email,phone,password,student_admission_numbers
Mr. Ojo Adewale,parent@email.com,+234 801 234 5678,parent123,QRL/2025/0001;QRL/2025/0002
Mrs. Nwosu Chidinma,parent2@email.com,+234 802 345 6789,parent123,QRL/2025/0003`;

    res.json({
        template,
        fields: [
            { name: 'full_name', required: true, description: "Parent's full name" },
            { name: 'email', required: true, description: "Parent's email (used for login)" },
            { name: 'phone', required: false, description: 'Phone number' },
            { name: 'password', required: false, description: 'Password (default: parent123)' },
            { name: 'student_admission_numbers', required: false, description: 'Student admission numbers separated by semicolon' },
        ],
    });
});

// POST /api/users/upload-parents-csv
router.post('/upload-parents-csv', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
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

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const full_name = (row.full_name || '').trim();
                const email = (row.email || '').trim();
                const phone = (row.phone || '').trim();
                const password = (row.password || generateDummyPassword()).trim();

                if (!full_name || !email) {
                    errors.push(`Row ${rowNum}: Missing required fields (full_name or email)`);
                    continue;
                }

                const existing = await db.collection('users').findOne({ email });
                if (existing) {
                    errors.push(`Row ${rowNum}: Email ${email} already exists`);
                    continue;
                }

                const userId = uuidv4();
                const userDoc = {
                    id: userId,
                    email,
                    password_hash: hashPassword(password),
                    full_name,
                    role: 'parent',
                    phone: phone || null,
                    must_change_password: true,
                    created_at: nowISO(),
                };
                await db.collection('users').insertOne(userDoc);

                // Send invitation email
                await sendInvitationEmail(email, full_name, 'Parent', password);

                const studentAdmissions = (row.student_admission_numbers || '').trim();
                if (studentAdmissions) {
                    for (const admission of studentAdmissions.split(';')) {
                        const trimmed = admission.trim();
                        if (trimmed) {
                            await db.collection('students').updateOne(
                                { admission_number: trimmed },
                                { $set: { parent_id: userId } }
                            );
                        }
                    }
                }

                created++;
            } catch (e: any) {
                errors.push(`Row ${rowNum}: ${e.message}`);
            }
        }

        res.json({ message: `Successfully created ${created} parent accounts`, created, errors });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
