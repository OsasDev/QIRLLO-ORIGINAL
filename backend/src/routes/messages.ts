import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';
import { nowISO } from '../helpers';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/messages
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id!;
        const data = req.body;
        const db = getDB();

        const messageId = uuidv4();
        // Recipient must be in the same school
        const recipient = await db.collection('users').findOne({ id: data.recipient_id, school_id }, { projection: { _id: 0 } });

        if (!recipient) {
            res.status(404).json({ detail: 'Recipient not found in your school' });
            return;
        }

        const messageDoc = {
            id: messageId,
            school_id, // Link to school
            sender_id: currentUser.id,
            sender_name: currentUser.full_name,
            recipient_id: data.recipient_id,
            recipient_name: recipient.full_name,
            subject: data.subject,
            content: data.content,
            message_type: data.message_type || 'direct',
            is_read: false,
            created_at: nowISO(),
        };
        await db.collection('messages').insertOne(messageDoc);
        res.json(messageDoc);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/messages
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        const db = getDB();
        const folder = (req.query.folder as string) || 'inbox';

        const query: any = folder === 'inbox'
            ? { recipient_id: currentUser.id, school_id }
            : { sender_id: currentUser.id, school_id };

        const messages = await db.collection('messages')
            .find(query, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .toArray();

        res.json(messages);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/messages/unread/count
router.get('/unread/count', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        const db = getDB();
        const count = await db.collection('messages').countDocuments({
            recipient_id: currentUser.id,
            school_id,
            is_read: false,
        });
        res.json({ count });
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

// GET /api/messages/:messageId
router.get('/:messageId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as AuthRequest).user!;
        const school_id = (req as AuthRequest).school_id;
        const db = getDB();

        const message = await db.collection('messages').findOne(
            { id: req.params.messageId, school_id },
            { projection: { _id: 0 } }
        );
        if (!message) {
            res.status(404).json({ detail: 'Message not found or access denied' });
            return;
        }

        if (message.recipient_id === currentUser.id && !message.is_read) {
            await db.collection('messages').updateOne(
                { id: req.params.messageId, school_id },
                { $set: { is_read: true } }
            );
            message.is_read = true;
        }

        res.json(message);
    } catch (err: any) {
        res.status(500).json({ detail: err.message });
    }
});

export default router;
