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
