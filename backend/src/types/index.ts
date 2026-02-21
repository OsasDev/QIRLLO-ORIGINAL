// ============ USER TYPES ============

export interface UserCreate {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'teacher' | 'parent';
    school_id?: string;
    phone?: string;
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface UserResponse {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone?: string | null;
    created_at: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user: UserResponse;
}

export interface UserDoc {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    school_id: string;
    phone?: string | null;
    must_change_password?: boolean;
    created_at: string;
}

// ============ STUDENT TYPES ============

export interface StudentCreate {
    full_name: string;
    admission_number: string;
    class_id: string;
    gender: 'male' | 'female';
    school_id?: string; // Added for multi-tenancy
    date_of_birth?: string | null;
    parent_id?: string | null;
    address?: string | null;
}

export interface StudentResponse {
    id: string;
    full_name: string;
    admission_number: string;
    class_id: string;
    school_id: string;
    class_name?: string | null;
    gender: string;
    date_of_birth?: string | null;
    parent_id?: string | null;
    parent_name?: string | null;
    parent_email?: string | null;
    parent_phone?: string | null;
    address?: string | null;
    total_fees?: number;
    fees_paid?: number;
    fee_balance?: number;
    created_at: string;
}

// ============ CLASS TYPES ============

export interface ClassCreate {
    name: string;
    level: 'JSS1' | 'JSS2' | 'JSS3' | 'SS1' | 'SS2' | 'SS3';
    section?: string;
    teacher_id?: string | null;
    academic_year?: string;
}

export interface ClassResponse {
    id: string;
    name: string;
    level: string;
    section?: string | null;
    teacher_id?: string | null;
    teacher_name?: string | null;
    academic_year: string;
    student_count: number;
    created_at: string;
}

// ============ SUBJECT TYPES ============

export interface SubjectCreate {
    name: string;
    code: string;
    class_id: string;
    teacher_id?: string | null;
}

export interface SubjectResponse {
    id: string;
    name: string;
    code: string;
    class_id: string;
    class_name?: string | null;
    teacher_id?: string | null;
    teacher_name?: string | null;
    created_at: string;
}

// ============ GRADE TYPES ============

export interface GradeEntry {
    student_id: string;
    subject_id: string;
    ca_score: number;
    exam_score: number;
    term: 'first' | 'second' | 'third';
    academic_year?: string;
    comment?: string | null;
}

export interface GradeResponse {
    id: string;
    student_id: string;
    student_name?: string | null;
    subject_id: string;
    subject_name?: string | null;
    ca_score: number;
    exam_score: number;
    total_score: number;
    grade: string;
    term: string;
    academic_year: string;
    comment?: string | null;
    status: string;
    teacher_id?: string | null;
    created_at: string;
}

export interface GradeBulkEntry {
    subject_id: string;
    term: string;
    academic_year?: string;
    grades: Array<{
        student_id: string;
        ca_score: number;
        exam_score: number;
        comment?: string;
    }>;
}

// ============ MESSAGE TYPES ============

export interface MessageCreate {
    recipient_id: string;
    subject: string;
    content: string;
    message_type?: string;
}

export interface MessageResponse {
    id: string;
    sender_id: string;
    sender_name?: string | null;
    recipient_id: string;
    recipient_name?: string | null;
    subject: string;
    content: string;
    message_type: string;
    is_read: boolean;
    created_at: string;
}

// ============ ANNOUNCEMENT TYPES ============

export interface AnnouncementCreate {
    title: string;
    content: string;
    target_audience: 'all' | 'teachers' | 'parents' | 'students';
    priority?: string;
}

export interface AnnouncementResponse {
    id: string;
    title: string;
    content: string;
    target_audience: string;
    priority: string;
    author_id: string;
    author_name?: string | null;
    created_at: string;
}

// ============ ATTENDANCE TYPES ============

export interface AttendanceEntry {
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string | null;
}

export interface AttendanceBulkEntry {
    class_id: string;
    date: string;
    records: Array<{
        student_id: string;
        status: string;
        notes?: string;
    }>;
}

export interface AttendanceResponse {
    id: string;
    student_id: string;
    student_name?: string | null;
    class_id: string;
    class_name?: string | null;
    date: string;
    status: string;
    notes?: string | null;
    marked_by?: string | null;
    created_at: string;
}

// ============ FEES TYPES ============

export interface FeeStructure {
    class_level: string;
    term: string;
    academic_year?: string;
    tuition: number;
    books?: number;
    uniform?: number;
    other_fees?: number;
    total?: number;
}

export interface FeePayment {
    student_id: string;
    amount: number;
    payment_method: 'cash' | 'transfer' | 'card' | 'pos';
    term: string;
    academic_year?: string;
    receipt_number?: string | null;
    notes?: string | null;
}

export interface FeePaymentResponse {
    id: string;
    student_id: string;
    student_name?: string | null;
    class_name?: string | null;
    amount: number;
    payment_method: string;
    term: string;
    academic_year: string;
    receipt_number?: string | null;
    notes?: string | null;
    recorded_by?: string | null;
    created_at: string;
}

export interface StudentFeeBalance {
    student_id: string;
    student_name: string;
    class_name: string;
    total_fees: number;
    total_paid: number;
    balance: number;
    payments: FeePaymentResponse[];
}

// ============ SCHOOL SETTINGS TYPES ============

export interface SchoolSettings {
    id: string;
    school_name: string;
    school_logo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    motto?: string | null;
    updated_at: string;
}

// ============ AUTH TYPES ============

export interface JWTPayload {
    sub: string;
    role: string;
    school_id: string;
    exp: number;
}

// Express request extension
import { Request } from 'express';

export interface AuthRequest extends Request {
    user?: UserDoc;
    school_id?: string;
}
