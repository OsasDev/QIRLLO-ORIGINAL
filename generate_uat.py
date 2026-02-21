import pandas as pd

# Define Exhuastive UAT test cases grouped by role
admin_cases = [
    ["TC-ADM-001", "Onboarding", "School Profile Setup", "1. Navigate to /onboarding\n2. Enter Name, Motto, Email, Phone, Address\n3. Click Save", "Profile saved successfully; Progress bar updates"],
    ["TC-ADM-002", "Onboarding", "Logo Branding", "1. Upload school logo in Step 1\n2. Complete onboarding", "Logo appears in sidebar and dashboard headers"],
    ["TC-ADM-003", "Onboarding", "Admin Account Creation", "1. Provide email/password in Step 2\n2. Click Create", "Admin account created; System redirects to Step 3"],
    ["TC-ADM-004", "Onboarding", "Quick Class Selection", "1. Click 'Add All Standard Classes' in Step 3\n2. Review list", "Standard Nigerian curriculum classes are auto-populated"],
    ["TC-ADM-005", "User Management", "Invite Teacher", "1. Go to Teachers > Add Teacher\n2. Enter details\n3. Send Invite", "Teacher added to system; Invitation status is 'Sent'"],
    ["TC-ADM-006", "User Management", "Bulk Parent Invitation", "1. Upload students via CSV\n2. Check Parent list", "Parent accounts are auto-created for each new student uploaded"],
    ["TC-ADM-007", "Student Management", "Manual Student Admission", "1. Students > Add New\n2. Fill Bio, Class, and Parent info\n3. Save", "Student ID is generated; Student appears in class list"],
    ["TC-ADM-008", "Student Management", "Edit Student Record", "1. Select student\n2. Click Edit\n3. Update Phone/Address\n4. Save", "Changes persist and are visible immediately"],
    ["TC-ADM-009", "Academic Config", "Create New Subject", "1. Academics > Subjects > New\n2. Enter 'Chemistry' and Category", "Subject available for assignment to teachers"],
    ["TC-ADM-010", "Academic Config", "Assign Subject to Teacher", "1. Edit Teacher\n2. Select Subjects they teach\n3. Save", "Teacher can now enter grades for that subject"],
    ["TC-ADM-011", "Finance", "Set Global Fee Structure", "1. Finance > Fees > Set Structure\n2. Add 'Tuition' for 'JSS1'", "Fee automatically applied to all students in JSS1"],
    ["TC-ADM-012", "Finance", "Record Payment manually", "1. Finance > Payments > Add\n2. Search student\n3. Enter amount", "Payment logged; Receipt summary available; Balance updated"],
    ["TC-ADM-013", "Academic Oversight", "Approve Grade Sheet", "1. Academics > Grade Approvals\n2. Select a Teacher submission\n3. Approve", "Grades finalized; Parents can now see them"],
    ["TC-ADM-014", "Academic Oversight", "Reject Grade Sheet", "1. Reject a submission with 'Incorrect weighting' comment", "Teacher notified; Sheet unlocked for teacher correction"],
    ["TC-ADM-015", "Communication", "School-wide Announcement", "1. Announcements > New\n2. Type 'Public Holiday' notice\n3. Post", "Notice appears on all user dashboards"],
]

teacher_cases = [
    ["TC-TEA-001", "Auth", "First Login Flow", "1. Open site\n2. Use credentials from invite email\n3. Login", "System forces password change before dashboard access"],
    ["TC-TEA-002", "Classroom", "View Assigned Classes", "1. Open Academics > My Classes", "Only classes assigned by Admin are shown"],
    ["TC-TEA-003", "Attendance", "Daily Roll Call", "1. Select Class/Date\n2. Toggle Present/Absent\n3. Save", "Attendance percentage for students is updated"],
    ["TC-TEA-004", "Attendance", "Attendance Correction", "1. Open past date attendance\n2. Change 'Absent' to 'Late'\n3. Save", "Record updated; System logs the change"],
    ["TC-TEA-005", "Grades", "Single Student Grade Entry", "1. Select Student\n2. Enter CA1, CA2 scores\n3. Save", "Total and Grade (A,B,C) auto-calculate based on school policy"],
    ["TC-TEA-006", "Grades", "Bulk Subject Grade Entry", "1. Use 'Bulk Entry' mode\n2. Input entire class exam scores\n3. Save as Draft", "Drafts are saved for later; NOT visible to parents yet"],
    ["TC-TEA-007", "Grades", "Submit to Admin", "1. Verify all scores\n2. Click 'Submit for Review'", "Sheet status becomes 'Pending'; Editing is locked for teacher"],
    ["TC-TEA-008", "Communication", "Message Parent", "1. Messages > Compose\n2. Select specific Student's Parent\n3. Send", "Parent receives notification; Thread started"],
    ["TC-TEA-009", "Dashboard", "View Stats", "1. Check dashboard widgets", "Shows count of Students in assigned classes and pending grades"],
]

parent_cases = [
    ["TC-PAR-001", "Dashboard", "Student Performance Overview", "1. Login as Parent", "Brief stats showing attendance % and top grade for child"],
    ["TC-PAR-002", "Performance", "Detailed Grade Report", "1. Performance > View Reports\n2. Select Subject", "Shows breakdown of CAs and Exam scores once approved"],
    ["TC-PAR-003", "Finance", "View Fee Balance", "1. Finance > My Bills", "Shows total owed, items Paid, and outstanding balance"],
    ["TC-PAR-004", "Finance", "View Payment History", "1. Finance > Receipts", "Lists all previous payments with dates and methods"],
    ["TC-PAR-005", "Attendance", "Child's Attendance Record", "1. Academics > Attendance", "Shows calendar view of Present/Absent days"],
    ["TC-PAR-006", "Communication", "Read Announcements", "1. Dashboard > Announcements", "School news (like 'Parent-Teacher Meeting') is displayed"],
    ["TC-PAR-007", "Communication", "Messaging Teacher", "1. Messages > New\n2. Choose child's Form Teacher\n3. Send query", "Teacher receives message; History is tracked"],
    ["TC-PAR-008", "Security", "Profile Update", "1. Settings > Profile\n2. Update Phone/Address\n3. Save", "Contact info updated for school records"],
]

def create_sheet_df(data):
    df = pd.DataFrame(data, columns=["Case ID", "Module", "Test Title", "Steps", "Expected Result"])
    df["Actual Result"] = ""
    df["Status (Pass/Fail)"] = ""
    df["Comments"] = ""
    return df

# Initialize Excel Writer
output_file = "QIRLLO_MultiRole_UAT.xlsx"
writer = pd.ExcelWriter(output_file, engine='xlsxwriter')

# Create and write sheets
create_sheet_df(admin_cases).to_excel(writer, index=False, sheet_name='Admin UAT')
create_sheet_df(teacher_cases).to_excel(writer, index=False, sheet_name='Teacher UAT')
create_sheet_df(parent_cases).to_excel(writer, index=False, sheet_name='Parent UAT')

# Professional Formatting
workbook  = writer.book
header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC', 'border': 1})
wrap_fmt = workbook.add_format({'text_wrap': True, 'align': 'top', 'border': 1})
id_fmt = workbook.add_format({'bold': True, 'align': 'center', 'valign': 'top', 'border': 1})

for sheet_name in ['Admin UAT', 'Teacher UAT', 'Parent UAT']:
    worksheet = writer.sheets[sheet_name]
    worksheet.set_column('A:A', 12, id_fmt)      # Case ID
    worksheet.set_column('B:B', 20, wrap_fmt)    # Module
    worksheet.set_column('C:C', 35, wrap_fmt)    # Title
    worksheet.set_column('D:D', 50, wrap_fmt)    # Steps
    worksheet.set_column('E:E', 40, wrap_fmt)    # Expected
    worksheet.set_column('F:H', 20, wrap_fmt)    # Results columns
    
    # Format Headers (manually write them back with formatting)
    headers = ["Case ID", "Module", "Test Title", "Steps", "Expected Result", "Actual Result", "Status (Pass/Fail)", "Comments"]
    for col_num, header in enumerate(headers):
        worksheet.write(0, col_num, header, header_fmt)

writer.close()
print(f"Multi-Sheet UAT generated: {output_file}")
