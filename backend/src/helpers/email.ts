import nodemailer from 'nodemailer';
import { getDB } from '../db';

// SMTP config from .env — when SMTP_HOST is not set, emails are logged to console (mock mode)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'user';
const SMTP_PASS = process.env.SMTP_PASS || 'pass';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@school.com';

// For development/demo, we'll just log to console if no real credentials
const isMock = !process.env.SMTP_HOST;

const transporter = isMock
    ? {
        sendMail: async (mailOptions: any) => {
            console.log('================================================');
            console.log('📧 MOCK EMAIL SENT');
            console.log('To:', mailOptions.to);
            console.log('Subject:', mailOptions.subject);
            console.log('Body:', mailOptions.text);
            console.log('================================================');
            return { messageId: 'mock-123' };
        }
    }
    : nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

// Helper to fetch the school name from DB
async function getSchoolName(): Promise<string> {
    try {
        const db = getDB();
        const settings = await db.collection('school_settings').findOne({});
        return settings?.school_name || 'QIRLLO School';
    } catch {
        return 'QIRLLO School';
    }
}

export async function sendInvitationEmail(email: string, name: string, role: string, password: string) {
    const schoolName = await getSchoolName();
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/login';

    const subject = `Welcome to ${schoolName} - Your Account Details`;

    const text = `
Dear ${name},

You have been invited to join ${schoolName} as a ${role}.

Here are your login credentials:
Email: ${email}
Password: ${password}

Please log in at: ${loginUrl}

IMPORTANT: You will be required to change your password upon your first login.

Best regards,
School Administration
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Welcome to ${schoolName}</h2>
    <p>Dear ${name},</p>
    <p>You have been invited to join <strong>${schoolName}</strong> as a <strong>${role}</strong>.</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
    </div>

    <p>Please <a href="${loginUrl}">click here to log in</a>.</p>
    
    <p style="color: #d9534f; font-weight: bold;">IMPORTANT: You will be required to change your password upon your first login.</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
    <p style="color: #777; font-size: 12px;">This is an automated message. Please do not reply.</p>
</div>
    `;

    try {
        await (transporter as any).sendMail({
            from: `"${schoolName}" <${FROM_EMAIL}>`,
            to: email,
            subject,
            text,
            html,
        });
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}
