import express from 'express';
import cors from 'cors';
import { connectDB, closeDB } from './db';
import { CORS_ORIGINS, PORT } from './config';

// Route imports
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import studentsRoutes from './routes/students';
import classesRoutes from './routes/classes';
import subjectsRoutes from './routes/subjects';
import gradesRoutes from './routes/grades';
import messagesRoutes from './routes/messages';
import announcementsRoutes from './routes/announcements';
import attendanceRoutes from './routes/attendance';
import feesRoutes from './routes/fees';
import dashboardRoutes from './routes/dashboard';
import seedRoutes from './routes/seed';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: CORS_ORIGINS === '*' ? '*' : CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seed', seedRoutes);

// Standalone /api/teachers and /api/parents routes (frontend expects top-level paths)
import { authMiddleware } from './middleware/auth';
import { getDB } from './db';

app.get('/api/teachers', authMiddleware, async (_req: express.Request, res: express.Response) => {
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

app.get('/api/parents', authMiddleware, async (_req: express.Request, res: express.Response) => {
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

// Root API route
app.get('/api', (_req: express.Request, res: express.Response) => {
    res.json({ message: 'QIRLLO School Management API', version: '1.0.0' });
});

// Start server
async function start() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`QIRLLO API server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDB();
    process.exit(0);
});

start();
