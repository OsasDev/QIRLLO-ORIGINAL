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
        const data = req.body;
        const db = getDB();

        const messageId = uuidv4();
        const recipient = await db.collection('users').findOne({ id: data.recipient_id }, { projection: { _id: 0 } });

        const messageDoc = {
            id: messageId,
            sender_id: currentUser.id,
            sender_name: currentUser.full_name,
            recipient_id: data.recipient_id,
            recipient_name: recipient ? recipient.full_name : null,
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
        const db = getDB();
        const folder = (req.query.folder as string) || 'inbox';

        const query = folder === 'inbox'
            ? { recipient_id: currentUser.id }
            : { sender_id: currentUser.id };

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
        const db = getDB();
        const count = await db.collection('messages').countDocuments({
            recipient_id: currentUser.id,
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
        const db = getDB();

        const message = await db.collection('messages').findOne(
            { id: req.params.messageId },
            { projection: { _id: 0 } }
        );
        if (!message) {
            res.status(404).json({ detail: 'Message not found' });
            return;
        }

        if (message.recipient_id === currentUser.id && !message.is_read) {
            await db.collection('messages').updateOne(
                { id: req.params.messageId },
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
