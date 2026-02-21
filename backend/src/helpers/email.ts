import nodemailer from 'nodemailer';
import { getDB } from '../db';
import {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
    FRONTEND_URL
} from '../config';

// For development/demo, we'll just log to console if no real credentials
const isMock = !SMTP_HOST || SMTP_HOST === 'smtp.example.com';

if (isMock) {
    console.log('📧 Email Service: MOCK MODE active (missing/default SMTP_HOST)');
} else {
    console.log(`📧 Email Service: LIVE MODE active (Using ${SMTP_HOST}:${SMTP_PORT})`);
}

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

// Verify connection configuration on startup if not in mock mode
if (!isMock && (transporter as any).verify) {
    (transporter as any).verify((error: any, success: any) => {
        if (error) {
            console.error('❌ SMTP Connection Error:', error);
        } else {
            console.log('✅ SMTP Server is ready to take messages');
        }
    });
}

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
    const loginUrl = `${FRONTEND_URL}/login`;

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
        console.log(`📧 Attempting to send invite email to: ${email}...`);
        const info = await (transporter as any).sendMail({
            from: `"${schoolName}" <${FROM_EMAIL}>`,
            to: email,
            subject,
            text,
            html,
        });
        console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ CRITICAL: Failed to send email to ${email}:`, error);
        return false;
    }
}
