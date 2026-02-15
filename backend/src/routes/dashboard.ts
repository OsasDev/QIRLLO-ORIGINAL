import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const db = getDB();

        // Fetch school settings for all roles
        const schoolSettings = await db.collection('school_settings').findOne(
            {},
            { projection: { _id: 0 } }
        );
        const school_name = schoolSettings?.school_name || 'QIRLLO School';
        const school_logo = schoolSettings?.school_logo || null;

        if (currentUser.role === 'admin') {
            const totalStudents = await db.collection('students').countDocuments({});
            const totalTeachers = await db.collection('users').countDocuments({ role: 'teacher' });
            const totalParents = await db.collection('users').countDocuments({ role: 'parent' });
            const totalClasses = await db.collection('classes').countDocuments({});
            const pendingGrades = await db.collection('grades').countDocuments({ status: 'submitted' });
            const unreadMessages = await db.collection('messages').countDocuments({
                recipient_id: currentUser.id,
                is_read: false,
            });

            const feePayments = await db.collection('fee_payments')
                .find({}, { projection: { _id: 0, amount: 1 } })
                .toArray();
            const totalFeesCollected = feePayments.reduce((sum: number, p: any) => sum + p.amount, 0);

            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = await db.collection('attendance').countDocuments({ date: today });

            res.json({
                school_name,
                school_logo,
                total_students: totalStudents,
                total_teachers: totalTeachers,
                total_parents: totalParents,
                total_classes: totalClasses,
                pending_grades: pendingGrades,
                unread_messages: unreadMessages,
                revenue: totalStudents * 1000,
                fees_collected: totalFeesCollected,
                attendance_today: todayAttendance,
            });
            return;
        }

        if (currentUser.role === 'teacher') {
            const subjects = await db.collection('subjects')
                .find({ teacher_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const classIds = [...new Set(subjects.map((s: any) => s.class_id))];
            const totalStudents = await db.collection('students').countDocuments({ class_id: { $in: classIds } });
            const draftGrades = await db.collection('grades').countDocuments({
                teacher_id: currentUser.id,
                status: 'draft',
            });
            const unreadMessages = await db.collection('messages').countDocuments({
                recipient_id: currentUser.id,
                is_read: false,
            });

            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = await db.collection('attendance').countDocuments({
                class_id: { $in: classIds },
                date: today,
            });

            res.json({
                school_name,
                school_logo,
                total_classes: classIds.length,
                total_subjects: subjects.length,
                total_students: totalStudents,
                draft_grades: draftGrades,
                unread_messages: unreadMessages,
                attendance_today: todayAttendance,
            });
            return;
        }

        if (currentUser.role === 'parent') {
            const children = await db.collection('students')
                .find({ parent_id: currentUser.id }, { projection: { _id: 0 } })
                .toArray();
            const childIds = children.map((c: any) => c.id);
            const resultsCount = await db.collection('grades').countDocuments({
                student_id: { $in: childIds },
                status: 'approved',
            });
            const unreadMessages = await db.collection('messages').countDocuments({
                recipient_id: currentUser.id,
                is_read: false,
            });
            const announcements = await db.collection('announcements').countDocuments({
                $or: [{ target_audience: 'all' }, { target_audience: 'parents' }],
            });

            let totalBalance = 0;
            for (const child of children) {
                const payments = await db.collection('fee_payments')
                    .find({ student_id: child.id }, { projection: { _id: 0 } })
                    .toArray();
                const paid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                totalBalance += Math.max(0, 50000 - paid);
            }

            res.json({
                school_name,
                school_logo,
                total_children: children.length,
                results_available: resultsCount,
                unread_messages: unreadMessages,
                announcements,
                children,
                fee_balance: totalBalance,
            });
            return;
        }

        res.json({ school_name, school_logo });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;

