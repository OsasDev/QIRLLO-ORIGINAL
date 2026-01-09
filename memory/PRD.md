# QIRLLO - School Management Platform PRD

## Overview
**Product Name:** QIRLLO  
**Type:** School Management Platform (Web-first)  
**Market:** Nigerian private & public schools  
**Pricing:** ₦1,000 per child per month  
**Launch Date:** February 19, 2026

## User Personas

### 1. School Admin (Mrs. Adebayo Folake)
- Manages overall school operations
- Needs: Student enrollment, class management, teacher assignment, result approval
- Pain Points: Manual paperwork, delayed result processing

### 2. Teacher (Mr. Okonkwo Chukwuemeka)
- Enters grades for assigned subjects
- Needs: Quick grade entry, class lists, communication with admin
- Pain Points: Time-consuming grade calculations

### 3. Parent (Mr. Ojo Adewale)
- Monitors children's academic progress
- Needs: View results, receive announcements, contact teachers
- Pain Points: Lack of transparency in school communication

## Core Requirements

### Authentication & Authorization
- [x] JWT-based authentication
- [x] Role-based access control (admin, teacher, parent)
- [x] Secure password hashing with bcrypt

### Admin Dashboard Features
- [x] Dashboard with stats (students, teachers, classes, revenue)
- [x] Student CRUD operations
- [x] Class management (JSS1-SS3)
- [x] Teacher management
- [x] Subject management with teacher assignment
- [x] Results approval workflow
- [x] Messaging center
- [x] Announcements system

### Teacher Dashboard Features
- [x] My Classes view
- [x] Grade entry interface (40% CA + 60% Exam)
- [x] Spreadsheet view for desktop
- [x] Card view with drawer for mobile
- [x] Draft saving and submission
- [x] Auto-calculation of totals and grades

### Parent Dashboard Features
- [x] Children profile switcher
- [x] Academic results view
- [x] Digital report card
- [x] Announcements feed
- [x] Messaging with school

### Mobile Responsiveness
- [x] Bottom tab navigation for mobile
- [x] Touch-friendly grade entry
- [x] Drawer-based forms on mobile
- [x] Responsive stat cards

## What's Been Implemented (January 9, 2026)

### Backend (FastAPI)
- Complete REST API with /api prefix
- MongoDB integration with proper models
- JWT authentication
- CRUD for: Users, Students, Classes, Subjects, Grades, Messages, Announcements
- Dashboard stats endpoints for all roles
- Nigerian school seed data

### Frontend (React)
- Role-based routing and navigation
- Admin, Teacher, Parent dashboards
- Grade entry with auto-calculation
- Academic report card with print support
- Messaging interface
- Mobile-responsive layouts with bottom nav

### Design System
- QIRLLO brand colors (#1E40AF, #2563EB)
- Manrope + Public Sans typography
- Shadcn/UI components
- Nigerian school context (JSS/SS classes)

## Prioritized Backlog

### P0 (Critical for Launch)
- [x] Core dashboards for all roles
- [x] Grade entry and approval workflow
- [x] Parent result viewing

### P1 (Important)
- [ ] Attendance tracking
- [ ] Academic calendar
- [ ] Bulk student import (CSV)
- [ ] Term-wise result comparison
- [ ] Push notifications

### P2 (Nice to Have)
- [ ] Fee payment integration (Paystack)
- [ ] SMS notifications (Termii)
- [ ] Student photo management
- [ ] Class timetable
- [ ] Library management

## Next Tasks
1. Add attendance tracking module
2. Implement academic calendar
3. Add bulk student import via CSV
4. Integrate payment gateway for school fees
5. Add SMS notification support

---
## Update: January 9, 2026 - Added Features

### New Features Implemented

#### 1. Attendance Tracking
- **Teacher Attendance Page**: `/teacher/attendance`
  - Select class and date
  - Mark students as Present/Absent/Late/Excused
  - Bulk mark all present/absent
  - Save attendance with summary stats
  
- **Admin Attendance View**: `/admin/attendance`
  - Same functionality as teachers
  - Can mark for any class

- **Parent Attendance View**: `/parent/attendance-fees`
  - View attendance summary (rate, days present/absent/late)
  - Recent attendance records
  - Per-child view with switcher

#### 2. School Fees Management
- **Admin Fees Page**: `/admin/fees`
  - View all student fee balances
  - Record fee payments (cash/transfer/card/POS)
  - Auto-generated receipt numbers
  - Filter by class, status (paid/partial/unpaid), term
  - Summary stats: Collected, Outstanding, Collection Rate
  - Payment history tab

- **Parent Fee View**: `/parent/attendance-fees`
  - View outstanding balance
  - See total fees vs amount paid
  - Payment history with receipt numbers

#### 3. Bulk CSV Upload
- **Admin Bulk Upload Page**: `/admin/upload`
  - Download CSV template
  - Upload student records
  - Auto-link to existing classes and parents
  - Error reporting for failed rows
  
- **CSV Template Fields**:
  - Required: full_name, admission_number
  - Optional: class, gender, date_of_birth, parent_email, address

### API Endpoints Added
- `POST /api/attendance` - Mark single attendance
- `POST /api/attendance/bulk` - Bulk attendance marking
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/summary/{student_id}` - Attendance summary
- `POST /api/fees/payment` - Record fee payment
- `GET /api/fees/balance/{student_id}` - Student fee balance
- `GET /api/fees/balances` - All fee balances (admin)
- `POST /api/students/upload-csv` - Bulk CSV upload
- `GET /api/students/csv-template` - Download template

### Updated Navigation
- Admin sidebar: Added Attendance, School Fees, Bulk Upload
- Teacher sidebar: Added Attendance
- Parent sidebar: Added Attendance & Fees (combined view)
- Mobile nav updated with new tabs
