import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { hashPassword, calculateGrade, nowISO } from '../helpers';

const router = Router();

// POST /api/seed
router.post('/', async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const school_id = req.body.school_id || 'qirllo-demo-school';
        const school_name = req.body.school_name || 'QIRLLO Demonstration School';

        const existing = await db.collection('users').findOne({ email: 'admin@qirllo.com', school_id });
        if (existing) {
            res.json({ message: `Database already seeded for school ${school_name}` });
            return;
        }

        // Create school settings
        await db.collection('school_settings').insertOne({
            school_id,
            school_name,
            address: '123 Education Way, Lagos, Nigeria',
            phone: '+234 800 QIRLLO',
            email: 'info@qirllo.com',
            academic_year: '2025/2026',
            current_term: 'first',
            created_at: nowISO(),
        });

        // Create admin
        const adminId = uuidv4();
        await db.collection('users').insertOne({
            id: adminId,
            school_id,
            email: 'admin@qirllo.com',
            password_hash: hashPassword('admin123'),
            full_name: 'Mrs. Adebayo Folake',
            role: 'admin',
            phone: '+234 801 234 5678',
            created_at: nowISO(),
        });

        // Create teachers
        const teachersData = [
            { name: 'Mr. Okonkwo Chukwuemeka', email: 'okonkwo@qirllo.com', phone: '+234 802 345 6789' },
            { name: 'Mrs. Adesanya Bimpe', email: 'adesanya@qirllo.com', phone: '+234 803 456 7890' },
            { name: 'Mr. Ibrahim Musa', email: 'ibrahim@qirllo.com', phone: '+234 804 567 8901' },
        ];
        const teacherIds: string[] = [];
        for (const t of teachersData) {
            const tid = uuidv4();
            teacherIds.push(tid);
            await db.collection('users').insertOne({
                id: tid,
                school_id,
                email: t.email,
                password_hash: hashPassword('teacher123'),
                full_name: t.name,
                role: 'teacher',
                phone: t.phone,
                created_at: nowISO(),
            });
        }

        // Create parents
        const parentsData = [
            { name: 'Mr. Ojo Adewale', email: 'ojo@gmail.com', phone: '+234 805 678 9012' },
            { name: 'Mrs. Nwosu Chidinma', email: 'nwosu@gmail.com', phone: '+234 806 789 0123' },
            { name: 'Mr. Yusuf Abdullahi', email: 'yusuf@gmail.com', phone: '+234 807 890 1234' },
        ];
        const parentIds: string[] = [];
        for (const p of parentsData) {
            const pid = uuidv4();
            parentIds.push(pid);
            await db.collection('users').insertOne({
                id: pid,
                school_id,
                email: p.email,
                password_hash: hashPassword('parent123'),
                full_name: p.name,
                role: 'parent',
                phone: p.phone,
                created_at: nowISO(),
            });
        }

        // Create classes
        const classLevels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
        const classIds: string[] = [];
        for (let i = 0; i < classLevels.length; i++) {
            const cid = uuidv4();
            classIds.push(cid);
            await db.collection('classes').insertOne({
                id: cid,
                school_id,
                name: `${classLevels[i]} A`,
                level: classLevels[i],
                section: 'A',
                teacher_id: teacherIds[i % teacherIds.length],
                teacher_name: teachersData[i % teachersData.length].name,
                academic_year: '2025/2026',
                student_count: 0,
                created_at: nowISO(),
            });
        }

        // Create subjects
        const subjectsList = [
            { name: 'Mathematics', code: 'MTH' },
            { name: 'English Language', code: 'ENG' },
            { name: 'Yoruba', code: 'YOR' },
            { name: 'Civic Education', code: 'CIV' },
            { name: 'Basic Science', code: 'BSC' },
            { name: 'Social Studies', code: 'SOC' },
            { name: 'Computer Studies', code: 'ICT' },
            { name: 'Agricultural Science', code: 'AGR' },
        ];

        const subjectIds: Array<{ id: string; class_id: string }> = [];
        for (const cid of classIds.slice(0, 3)) {
            for (let j = 0; j < subjectsList.length; j++) {
                const sid = uuidv4();
                subjectIds.push({ id: sid, class_id: cid });
                await db.collection('subjects').insertOne({
                    id: sid,
                    school_id,
                    name: subjectsList[j].name,
                    code: subjectsList[j].code,
                    class_id: cid,
                    teacher_id: teacherIds[j % teacherIds.length],
                    teacher_name: teachersData[j % teachersData.length].name,
                    created_at: nowISO(),
                });
            }
        }

        // Create students
        const studentNames = [
            'Adebayo Oluwaseun', 'Okonkwo Chisom', 'Ibrahim Fatima', 'Nwosu Chinedu',
            'Yusuf Aisha', 'Adekunle Temitope', 'Obi Nneka', 'Bello Aminu',
            'Okoro Ifeanyi', 'Adeleke Titilayo', 'Mohammed Halima', 'Eze Obiora',
        ];

        const studentIds: string[] = [];
        for (let i = 0; i < studentNames.length; i++) {
            const stid = uuidv4();
            studentIds.push(stid);
            const classIdx = i % classIds.slice(0, 3).length;
            const parentIdx = i % parentIds.length;

            const classDoc = await db.collection('classes').findOne({ id: classIds[classIdx], school_id }, { projection: { _id: 0 } });

            await db.collection('students').insertOne({
                id: stid,
                school_id,
                full_name: studentNames[i],
                admission_number: `QRL/2025/${String(i + 1).padStart(4, '0')}`,
                class_id: classIds[classIdx],
                class_name: classDoc ? classDoc.name : null,
                gender: i % 2 === 0 ? 'male' : 'female',
                parent_id: parentIds[parentIdx],
                created_at: nowISO(),
            });
        }

        // Create sample grades
        for (const studentId of studentIds.slice(0, 6)) {
            const student = await db.collection('students').findOne({ id: studentId, school_id }, { projection: { _id: 0 } });
            if (!student) continue;

            const classSubjects = subjectIds.filter(s => s.class_id === student.class_id);

            for (const subj of classSubjects.slice(0, 4)) {
                const ca = Math.floor(Math.random() * 21) + 20; // 20-40
                const exam = Math.floor(Math.random() * 31) + 30; // 30-60
                const total = ca + exam;

                await db.collection('grades').insertOne({
                    id: uuidv4(),
                    school_id,
                    student_id: studentId,
                    student_name: student.full_name,
                    subject_id: subj.id,
                    ca_score: ca,
                    exam_score: exam,
                    total_score: total,
                    grade: calculateGrade(total),
                    term: 'first',
                    academic_year: '2025/2026',
                    status: 'approved',
                    teacher_id: teacherIds[0],
                    created_at: nowISO(),
                });
            }
        }

        // Create announcements
        await db.collection('announcements').insertOne({
            id: uuidv4(),
            school_id,
            title: 'Welcome to 2025/2026 Academic Session',
            content: "We welcome all students, parents, and staff to the new academic year. Let's make it a successful one!",
            target_audience: 'all',
            priority: 'high',
            author_id: adminId,
            author_name: 'Mrs. Adebayo Folake',
            created_at: nowISO(),
        });

        await db.collection('announcements').insertOne({
            id: uuidv4(),
            school_id,
            title: 'First Term Examination Schedule',
            content: 'First term examinations will begin on December 10th, 2025. All students are advised to prepare adequately.',
            target_audience: 'all',
            priority: 'normal',
            author_id: adminId,
            author_name: 'Mrs. Adebayo Folake',
            created_at: nowISO(),
        });

        res.json({
            message: `Database seeded successfully for school ${school_name}`,
            school_id,
            admin_email: 'admin@qirllo.com',
            admin_password: 'admin123',
        });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
