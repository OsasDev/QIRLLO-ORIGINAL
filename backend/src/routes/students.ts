import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { hashPassword, nowISO, generateDummyPassword, sendInvitationEmail } from '../helpers';
import { AuthRequest } from '../types';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

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

        // Resolve or auto-create parent
        let parentId = data.parent_id || null;
        let parentName = data.parent_name || null;
        let parentEmail = data.parent_email || null;
        let parentPhone = data.parent_phone || null;
        let parentCredentials: any = null;

        if (parentEmail && !parentId) {
            const existingParent = await db.collection('users').findOne(
                { email: parentEmail, role: 'parent' },
                { projection: { _id: 0 } }
            );
            if (existingParent) {
                parentId = existingParent.id;
                parentName = parentName || existingParent.full_name;
                parentPhone = parentPhone || existingParent.phone;
            } else if (parentName) {
                // Auto-create parent account
                const dummyPassword = generateDummyPassword();
                const newParentId = uuidv4();
                const parentDoc = {
                    id: newParentId,
                    email: parentEmail,
                    password_hash: hashPassword(dummyPassword),
                    full_name: parentName,
                    role: 'parent',
                    phone: parentPhone || null,
                    must_change_password: true,
                    created_at: nowISO(),
                };
                await db.collection('users').insertOne(parentDoc);
                parentId = newParentId;

                // Send invitation email
                await sendInvitationEmail(
                    parentEmail,
                    parentName,
                    'Parent',
                    dummyPassword
                );
                // We no longer return credentials in response as they are emailed
            }
        }

        const studentDoc = {
            id: studentId,
            full_name: data.full_name,
            admission_number: data.admission_number,
            class_id: data.class_id,
            class_name: classDoc ? classDoc.name : null,
            gender: data.gender,
            date_of_birth: data.date_of_birth || null,
            parent_id: parentId,
            parent_name: parentName,
            parent_email: parentEmail,
            parent_phone: parentPhone,
            address: data.address || null,
            created_at: nowISO(),
        };
        await db.collection('students').insertOne(studentDoc);

        const response: any = { ...studentDoc };
        // if (parentCredentials) { response.parent_credentials = parentCredentials; } // Removed
        res.json(response);
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

        // Enrich with fee data
        for (const student of students) {
            // Get fee structure for the student's class level
            const classDoc = student.class_id
                ? await db.collection('classes').findOne({ id: student.class_id }, { projection: { _id: 0 } })
                : null;

            let totalFees = 0;
            if (classDoc) {
                const feeStructures = await db.collection('fee_structures')
                    .find({ class_level: classDoc.level }, { projection: { _id: 0 } })
                    .toArray();
                totalFees = feeStructures.reduce((sum: number, f: any) => sum + (f.total || 0), 0);
            }

            const payments = await db.collection('fee_payments')
                .find({ student_id: student.id }, { projection: { _id: 0 } })
                .toArray();
            const feesPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

            student.total_fees = totalFees;
            student.fees_paid = feesPaid;
            student.fee_balance = totalFees - feesPaid;

            // Resolve parent info if not stored on student doc
            if (student.parent_id && !student.parent_name) {
                const parent = await db.collection('users').findOne(
                    { id: student.parent_id },
                    { projection: { _id: 0, password_hash: 0 } }
                );
                if (parent) {
                    student.parent_name = parent.full_name;
                    student.parent_email = parent.email;
                    student.parent_phone = parent.phone || null;
                }
            }
        }

        res.json(students);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/students/csv-template
router.get('/csv-template', async (_req: Request, res: Response) => {
    const template = `full_name,admission_number,class,gender,date_of_birth,parent_name,parent_email,parent_phone,address
John Doe,QRL/2025/0001,JSS1 A,male,2012-05-15,Mr. Ade Doe,parent@email.com,+234 801 234 5678,123 Lagos Street
Jane Smith,QRL/2025/0002,JSS1 A,female,2012-08-20,Mrs. Nkechi Smith,parent2@email.com,+234 802 345 6789,456 Abuja Road`;

    res.json({
        template,
        fields: [
            { name: 'full_name', required: true, description: "Student's full name" },
            { name: 'admission_number', required: true, description: 'Unique admission number' },
            { name: 'class', required: false, description: 'Class name (e.g., JSS1 A)' },
            { name: 'gender', required: false, description: 'male or female' },
            { name: 'date_of_birth', required: false, description: 'YYYY-MM-DD format' },
            { name: 'parent_name', required: false, description: "Parent's full name (auto-creates account if email provided)" },
            { name: 'parent_email', required: false, description: "Parent's email (used for login)" },
            { name: 'parent_phone', required: false, description: "Parent's phone number" },
            { name: 'address', required: false, description: "Student's address" },
        ],
    });
});

// GET /api/students/xlsx-template
router.get('/xlsx-template', async (_req: Request, res: Response) => {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Students
        const studentsData = [
            { full_name: 'John Doe', admission_number: 'QRL/2025/0001', class: 'JSS1 A', gender: 'male', date_of_birth: '2012-05-15', parent_name: 'Mr. Ade Doe', parent_email: 'parent@email.com', parent_phone: '+234 801 234 5678', address: '123 Lagos Street' },
            { full_name: 'Jane Smith', admission_number: 'QRL/2025/0002', class: 'JSS1 A', gender: 'female', date_of_birth: '2012-08-20', parent_name: 'Mrs. Nkechi Smith', parent_email: 'parent2@email.com', parent_phone: '+234 802 345 6789', address: '456 Abuja Road' },
        ];
        const wsStudents = XLSX.utils.json_to_sheet(studentsData);
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');

        // Sheet 2: Fees (class-level fee mapping)
        const feesData = [
            { class_level: 'JSS1', term: 'first', tuition: 50000, books: 5000, uniform: 3000, other_fees: 2000 },
            { class_level: 'JSS2', term: 'first', tuition: 55000, books: 5000, uniform: 3000, other_fees: 2000 },
            { class_level: 'JSS3', term: 'first', tuition: 60000, books: 6000, uniform: 3000, other_fees: 2500 },
            { class_level: 'SS1', term: 'first', tuition: 65000, books: 7000, uniform: 4000, other_fees: 3000 },
            { class_level: 'SS2', term: 'first', tuition: 70000, books: 7000, uniform: 4000, other_fees: 3000 },
            { class_level: 'SS3', term: 'first', tuition: 75000, books: 8000, uniform: 4000, other_fees: 3500 },
        ];
        const wsFees = XLSX.utils.json_to_sheet(feesData);
        XLSX.utils.book_append_sheet(wb, wsFees, 'Fees');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="students_fees_template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
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

        // Enrich with parent info
        if (student.parent_id && !student.parent_name) {
            const parent = await db.collection('users').findOne(
                { id: student.parent_id },
                { projection: { _id: 0, password_hash: 0 } }
            );
            if (parent) {
                student.parent_name = parent.full_name;
                student.parent_email = parent.email;
                student.parent_phone = parent.phone || null;
            }
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

        let studentsCreated = 0;
        let parentsCreated = 0;
        const errors: string[] = [];
        const parentCredentials: Array<{ email: string; password: string; name: string }> = [];
        const levels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const full_name = (row.full_name || '').trim();
                const admission_number = (row.admission_number || '').trim();
                const className = (row.class || '').trim();
                const gender = (row.gender || 'male').trim().toLowerCase();
                const parentName = (row.parent_name || '').trim();
                const parentEmail = (row.parent_email || '').trim();
                const parentPhone = (row.parent_phone || '').trim();

                if (!full_name || !admission_number) {
                    errors.push(`Row ${rowNum}: Missing required fields (full_name or admission_number)`);
                    continue;
                }

                const existingStudent = await db.collection('students').findOne({ admission_number });
                if (existingStudent) {
                    errors.push(`Row ${rowNum}: Admission number ${admission_number} already exists`);
                    continue;
                }

                // Resolve class
                let classDoc = await db.collection('classes').findOne({ name: className }, { projection: { _id: 0 } });
                if (!classDoc) {
                    const levelMatch = levels.find(l => className.toUpperCase().includes(l));
                    if (levelMatch) {
                        classDoc = await db.collection('classes').findOne({ level: levelMatch }, { projection: { _id: 0 } });
                    }
                }
                const classId = classDoc ? classDoc.id : null;

                // Resolve or auto-create parent
                let parentId: string | null = null;
                let resolvedParentName: string | null = parentName || null;
                let resolvedParentPhone: string | null = parentPhone || null;

                if (parentEmail) {
                    const existingParent = await db.collection('users').findOne(
                        { email: parentEmail, role: 'parent' },
                        { projection: { _id: 0 } }
                    );
                    if (existingParent) {
                        parentId = existingParent.id;
                        resolvedParentName = resolvedParentName || existingParent.full_name;
                        resolvedParentPhone = resolvedParentPhone || existingParent.phone;
                        // Re-send invitation if parent hasn't logged in yet
                        if (existingParent.must_change_password) {
                            const newDummyPassword = generateDummyPassword();
                            await db.collection('users').updateOne(
                                { id: existingParent.id },
                                { $set: { password_hash: hashPassword(newDummyPassword) } }
                            );
                            console.log(`📧 Re-sending invite to existing parent: ${parentEmail}`);
                            try {
                                await sendInvitationEmail(parentEmail, resolvedParentName || 'Parent', 'Parent', newDummyPassword);
                                console.log(`✅ Invite email resent to ${parentEmail}`);
                            } catch (emailErr) {
                                console.error(`❌ Email failed for ${parentEmail}:`, emailErr);
                                errors.push(`Row ${rowNum}: Parent linked but re-invitation email failed`);
                            }
                        }
                    } else if (parentName) {
                        // Auto-create parent account with dummy password
                        const dummyPassword = generateDummyPassword();
                        const newParentId = uuidv4();
                        const parentDoc = {
                            id: newParentId,
                            email: parentEmail,
                            password_hash: hashPassword(dummyPassword),
                            full_name: parentName,
                            role: 'parent',
                            phone: parentPhone || null,
                            must_change_password: true,
                            created_at: nowISO(),
                        };
                        await db.collection('users').insertOne(parentDoc);
                        parentId = newParentId;
                        parentsCreated++;
                        parentCredentials.push({
                            email: parentEmail,
                            password: dummyPassword,
                            name: parentName,
                        });
                        // Send invitation email to newly created parent
                        console.log(`📧 Sending new invite to: ${parentEmail}`);
                        try {
                            await sendInvitationEmail(parentEmail, parentName, 'Parent', dummyPassword);
                            console.log(`✅ Invite email sent to ${parentEmail}`);
                        } catch (emailErr) {
                            console.error(`❌ Email failed for ${parentEmail}:`, emailErr);
                            errors.push(`Row ${rowNum}: Parent created but invitation email failed to send`);
                        }
                    }
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
                    parent_name: resolvedParentName,
                    parent_email: parentEmail || null,
                    parent_phone: resolvedParentPhone,
                    address: (row.address || '').trim() || null,
                    created_at: nowISO(),
                };

                await db.collection('students').insertOne(studentDoc);
                studentsCreated++;
            } catch (e: any) {
                errors.push(`Row ${rowNum}: ${e.message}`);
            }
        }

        res.json({
            message: `Successfully created ${studentsCreated} students and ${parentsCreated} parent accounts`,
            students_created: studentsCreated,
            parents_created: parentsCreated,
            parent_credentials: parentCredentials,
            errors,
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// POST /api/students/upload-xlsx
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

        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const db = getDB();
        const levels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

        let studentsCreated = 0;
        let parentsCreated = 0;
        let feesProcessed = 0;
        const errors: string[] = [];

        // --- Process Fees sheet first ---
        if (wb.SheetNames.includes('Fees')) {
            const feesSheet = wb.Sheets['Fees'];
            const feesRows: any[] = XLSX.utils.sheet_to_json(feesSheet);
            for (let i = 0; i < feesRows.length; i++) {
                const row = feesRows[i];
                const rowNum = i + 2;
                try {
                    const classLevel = (row.class_level || '').toString().trim().toUpperCase();
                    const term = (row.term || 'first').toString().trim().toLowerCase();
                    if (!classLevel || !levels.includes(classLevel)) {
                        errors.push(`Fees Row ${rowNum}: Invalid class_level "${classLevel}". Must be one of: ${levels.join(', ')}`);
                        continue;
                    }
                    const tuition = parseFloat(row.tuition) || 0;
                    const books = parseFloat(row.books) || 0;
                    const uniform = parseFloat(row.uniform) || 0;
                    const otherFees = parseFloat(row.other_fees) || 0;
                    const total = tuition + books + uniform + otherFees;

                    await db.collection('fee_structures').updateOne(
                        { class_level: classLevel, term, academic_year: '2025/2026' },
                        {
                            $set: {
                                id: uuidv4(),
                                class_level: classLevel,
                                term,
                                academic_year: '2025/2026',
                                tuition, books, uniform, other_fees: otherFees, total,
                                created_at: nowISO(),
                            },
                        },
                        { upsert: true }
                    );
                    feesProcessed++;
                } catch (e: any) {
                    errors.push(`Fees Row ${rowNum}: ${e.message}`);
                }
            }
        }

        // --- Process Students sheet ---
        const studentsSheetName = wb.SheetNames.includes('Students') ? 'Students' : wb.SheetNames[0];
        const studentsSheet = wb.Sheets[studentsSheetName];
        const studentRows: any[] = XLSX.utils.sheet_to_json(studentsSheet);

        for (let i = 0; i < studentRows.length; i++) {
            const row = studentRows[i];
            const rowNum = i + 2;
            try {
                const full_name = (row.full_name || '').toString().trim();
                const admission_number = (row.admission_number || '').toString().trim();
                const className = (row.class || '').toString().trim();
                const gender = (row.gender || 'male').toString().trim().toLowerCase();
                const parentName = (row.parent_name || '').toString().trim();
                const parentEmail = (row.parent_email || '').toString().trim();
                const parentPhone = (row.parent_phone || '').toString().trim();

                if (!full_name || !admission_number) {
                    errors.push(`Students Row ${rowNum}: Missing required fields (full_name or admission_number)`);
                    continue;
                }

                const existingStudent = await db.collection('students').findOne({ admission_number });
                if (existingStudent) {
                    errors.push(`Students Row ${rowNum}: Admission number ${admission_number} already exists`);
                    continue;
                }

                // Resolve class
                let classDoc = await db.collection('classes').findOne({ name: className }, { projection: { _id: 0 } });
                if (!classDoc) {
                    const levelMatch = levels.find(l => className.toUpperCase().includes(l));
                    if (levelMatch) {
                        classDoc = await db.collection('classes').findOne({ level: levelMatch }, { projection: { _id: 0 } });
                    }
                }
                const classId = classDoc ? classDoc.id : null;

                // Resolve or auto-create parent
                let parentId: string | null = null;
                let resolvedParentName: string | null = parentName || null;
                let resolvedParentPhone: string | null = parentPhone || null;

                if (parentEmail) {
                    const existingParent = await db.collection('users').findOne(
                        { email: parentEmail, role: 'parent' },
                        { projection: { _id: 0 } }
                    );
                    if (existingParent) {
                        parentId = existingParent.id;
                        resolvedParentName = resolvedParentName || existingParent.full_name;
                        resolvedParentPhone = resolvedParentPhone || existingParent.phone;
                        // Re-send invitation if parent hasn't logged in yet
                        if (existingParent.must_change_password) {
                            const newDummyPassword = generateDummyPassword();
                            await db.collection('users').updateOne(
                                { id: existingParent.id },
                                { $set: { password_hash: hashPassword(newDummyPassword) } }
                            );
                            console.log(`📧 [XLSX] Re-sending invite to existing parent: ${parentEmail}`);
                            try {
                                await sendInvitationEmail(parentEmail, resolvedParentName || 'Parent', 'Parent', newDummyPassword);
                                console.log(`✅ [XLSX] Invite email resent to ${parentEmail}`);
                            } catch (emailErr) {
                                console.error(`❌ [XLSX] Email failed for ${parentEmail}:`, emailErr);
                                errors.push(`Students Row ${rowNum}: Parent linked but re-invitation email failed`);
                            }
                        }
                    } else if (parentName) {
                        const dummyPassword = generateDummyPassword();
                        const newParentId = uuidv4();
                        const parentDoc = {
                            id: newParentId,
                            email: parentEmail,
                            password_hash: hashPassword(dummyPassword),
                            full_name: parentName,
                            role: 'parent',
                            phone: parentPhone || null,
                            must_change_password: true,
                            created_at: nowISO(),
                        };
                        await db.collection('users').insertOne(parentDoc);
                        parentId = newParentId;
                        parentsCreated++;
                        // Send invitation email
                        console.log(`📧 [XLSX] Sending new invite to: ${parentEmail}`);
                        try {
                            await sendInvitationEmail(parentEmail, parentName, 'Parent', dummyPassword);
                            console.log(`✅ [XLSX] Invite email sent to ${parentEmail}`);
                        } catch (emailErr) {
                            console.error(`❌ [XLSX] Email failed for ${parentEmail}:`, emailErr);
                            errors.push(`Students Row ${rowNum}: Parent created but invitation email failed`);
                        }
                    }
                }

                const studentId = uuidv4();
                const studentDoc = {
                    id: studentId,
                    full_name,
                    admission_number,
                    class_id: classId,
                    class_name: classDoc ? classDoc.name : className,
                    gender: ['male', 'female'].includes(gender) ? gender : 'male',
                    date_of_birth: (row.date_of_birth || '').toString().trim() || null,
                    parent_id: parentId,
                    parent_name: resolvedParentName,
                    parent_email: parentEmail || null,
                    parent_phone: resolvedParentPhone,
                    address: (row.address || '').toString().trim() || null,
                    created_at: nowISO(),
                };

                await db.collection('students').insertOne(studentDoc);
                studentsCreated++;
            } catch (e: any) {
                errors.push(`Students Row ${rowNum}: ${e.message}`);
            }
        }

        res.json({
            message: `Created ${studentsCreated} students, ${parentsCreated} parent accounts, ${feesProcessed} fee structures`,
            students_created: studentsCreated,
            parents_created: parentsCreated,
            fees_processed: feesProcessed,
            errors,
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
