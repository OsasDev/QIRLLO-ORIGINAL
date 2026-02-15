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

// POST /api/fees/structure
router.post('/structure', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();
        const total = (data.tuition || 0) + (data.books || 0) + (data.uniform || 0) + (data.other_fees || 0);

        const feeId = uuidv4();
        const feeDoc = {
            id: feeId,
            class_level: data.class_level,
            term: data.term,
            academic_year: data.academic_year || '2025/2026',
            tuition: data.tuition,
            books: data.books || 0,
            uniform: data.uniform || 0,
            other_fees: data.other_fees || 0,
            total,
            created_at: nowISO(),
        };

        await db.collection('fee_structures').updateOne(
            { class_level: data.class_level, term: data.term, academic_year: data.academic_year || '2025/2026' },
            { $set: feeDoc },
            { upsert: true }
        );

        res.json(feeDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/fees/structure
router.get('/structure', authMiddleware, async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const query: any = {};
        if (req.query.class_level) query.class_level = req.query.class_level;
        if (req.query.term) query.term = req.query.term;

        const structures = await db.collection('fee_structures')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        res.json(structures);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/fees/payment
router.post('/payment', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const data = req.body;
        const db = getDB();

        const student = await db.collection('students').findOne({ id: data.student_id }, { projection: { _id: 0 } });
        if (!student) {
            res.status(404).json({ detail: 'Student not found' });
            return;
        }

        const paymentId = uuidv4();
        const now = new Date();
        const receiptNumber = data.receipt_number || `RCP-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${paymentId.slice(0, 8).toUpperCase()}`;

        const paymentDoc = {
            id: paymentId,
            student_id: data.student_id,
            student_name: student.full_name,
            class_name: student.class_name || null,
            amount: data.amount,
            payment_method: data.payment_method,
            term: data.term,
            academic_year: data.academic_year || '2025/2026',
            receipt_number: receiptNumber,
            notes: data.notes || null,
            recorded_by: currentUser.id,
            created_at: nowISO(),
        };

        await db.collection('fee_payments').insertOne(paymentDoc);
        res.json(paymentDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/fees/payments
router.get('/payments', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        const query: any = {};
        if (req.query.student_id) query.student_id = req.query.student_id;
        if (req.query.term) query.term = req.query.term;

        if (currentUser.role === 'parent') {
            const children = await db.collection('students')
                .find({ parent_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const childIds = children.map((c: any) => c.id);
            query.student_id = { $in: childIds };
        }

        const payments = await db.collection('fee_payments')
            .find(query, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .toArray();

        res.json(payments);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/fees/balance/:studentId
router.get('/balance/:studentId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();
        const term = (req.query.term as string) || 'first';

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

        const classDoc = await db.collection('classes').findOne({ id: student.class_id }, { projection: { _id: 0 } });
        const classLevel = classDoc ? classDoc.level : 'JSS1';

        const feeStructure = await db.collection('fee_structures').findOne(
            { class_level: classLevel, term },
            { projection: { _id: 0 } }
        );

        const totalFees = feeStructure ? feeStructure.total : 50000;

        const payments = await db.collection('fee_payments')
            .find({ student_id: req.params.studentId, term }, { projection: { _id: 0 } })
            .toArray();

        const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const balance = totalFees - totalPaid;

        res.json({
            student_id: req.params.studentId,
            student_name: student.full_name,
            class_name: student.class_name || '',
            total_fees: totalFees,
            total_paid: totalPaid,
            balance,
            payments,
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/fees/balances
router.get('/balances', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        if (currentUser.role !== 'admin') {
            res.status(403).json({ detail: 'Admin access required' });
            return;
        }

        const db = getDB();
        const term = (req.query.term as string) || 'first';
        const query: any = {};
        if (req.query.class_id) query.class_id = req.query.class_id;

        const students = await db.collection('students')
            .find(query, { projection: { _id: 0 } })
            .toArray();

        const balances: any[] = [];

        for (const student of students) {
            const classDoc = await db.collection('classes').findOne({ id: student.class_id }, { projection: { _id: 0 } });
            const classLevel = classDoc ? classDoc.level : 'JSS1';

            const feeStructure = await db.collection('fee_structures').findOne(
                { class_level: classLevel, term },
                { projection: { _id: 0 } }
            );

            const totalFees = feeStructure ? feeStructure.total : 50000;

            const payments = await db.collection('fee_payments')
                .find({ student_id: student.id, term }, { projection: { _id: 0 } })
                .toArray();

            const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
            const balance = totalFees - totalPaid;

            balances.push({
                student_id: student.id,
                student_name: student.full_name,
                admission_number: student.admission_number,
                class_name: student.class_name || null,
                total_fees: totalFees,
                total_paid: totalPaid,
                balance,
                status: balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
            });
        }

        res.json(balances);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/fees/payments-csv-template
router.get('/payments-csv-template', async (_req: Request, res: Response) => {
    const template = `admission_number,amount,payment_method,term,notes
QRL/2025/0001,50000,transfer,first,First term full payment
QRL/2025/0002,25000,cash,first,Partial payment
QRL/2025/0003,50000,pos,first,`;

    res.json({
        template,
        fields: [
            { name: 'admission_number', required: true, description: "Student's admission number" },
            { name: 'amount', required: true, description: 'Payment amount in Naira' },
            { name: 'payment_method', required: false, description: 'cash, transfer, card, or pos (default: transfer)' },
            { name: 'term', required: false, description: 'first, second, or third (default: first)' },
            { name: 'notes', required: false, description: 'Payment notes' },
        ],
    });
});

// POST /api/fees/upload-payments-csv
router.post('/upload-payments-csv', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
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
                const admissionNumber = (row.admission_number || '').trim();
                const amountStr = (row.amount || '').trim();
                const paymentMethod = (row.payment_method || 'transfer').trim().toLowerCase();
                const term = (row.term || 'first').trim().toLowerCase();

                if (!admissionNumber || !amountStr) {
                    errors.push(`Row ${rowNum}: Missing required fields (admission_number or amount)`);
                    continue;
                }

                const student = await db.collection('students').findOne(
                    { admission_number: admissionNumber },
                    { projection: { _id: 0 } }
                );
                if (!student) {
                    errors.push(`Row ${rowNum}: Student ${admissionNumber} not found`);
                    continue;
                }

                const amount = parseFloat(amountStr);
                if (isNaN(amount)) {
                    errors.push(`Row ${rowNum}: Invalid amount ${amountStr}`);
                    continue;
                }

                const paymentId = uuidv4();
                const now = new Date();
                const receiptNumber = `RCP-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${paymentId.slice(0, 8).toUpperCase()}`;

                const paymentDoc = {
                    id: paymentId,
                    student_id: student.id,
                    student_name: student.full_name,
                    class_name: student.class_name || null,
                    amount,
                    payment_method: ['cash', 'transfer', 'card', 'pos'].includes(paymentMethod) ? paymentMethod : 'transfer',
                    term: ['first', 'second', 'third'].includes(term) ? term : 'first',
                    academic_year: '2025/2026',
                    receipt_number: receiptNumber,
                    notes: (row.notes || '').trim() || null,
                    recorded_by: currentUser.id,
                    created_at: nowISO(),
                };

                await db.collection('fee_payments').insertOne(paymentDoc);
                created++;
            } catch (e: any) {
                errors.push(`Row ${rowNum}: ${e.message}`);
            }
        }

        res.json({ message: `Successfully recorded ${created} payments`, created, errors });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
