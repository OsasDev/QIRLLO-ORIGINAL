#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class QirlloAPITester:
    def __init__(self, base_url="https://edupro-nigeria.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.teacher_token = None
        self.parent_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'students': [],
            'classes': [],
            'subjects': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Test seeding database with sample data"""
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_login(self, email, password, role):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login as {role}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            token = response['access_token']
            if role == 'admin':
                self.admin_token = token
            elif role == 'teacher':
                self.teacher_token = token
            elif role == 'parent':
                self.parent_token = token
            return True, token
        return False, None

    def test_dashboard_stats(self, token, role):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            f"Dashboard Stats ({role})",
            "GET",
            "dashboard/stats",
            200,
            token=token
        )
        if success:
            print(f"   Stats: {json.dumps(response, indent=2)}")
        return success

    def test_students_crud(self):
        """Test Students CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token required for student operations")
            return False

        # Get classes first
        success, classes = self.run_test(
            "Get Classes for Student Creation",
            "GET",
            "classes",
            200,
            token=self.admin_token
        )
        
        if not success or not classes:
            print("❌ No classes available for student creation")
            return False

        class_id = classes[0]['id']

        # Create student
        student_data = {
            "full_name": "Test Student API",
            "admission_number": f"TEST/{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "class_id": class_id,
            "gender": "male"
        }
        
        success, response = self.run_test(
            "Create Student",
            "POST",
            "students",
            200,
            data=student_data,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        student_id = response.get('id')
        if student_id:
            self.created_ids['students'].append(student_id)

        # Get students
        success, _ = self.run_test(
            "Get All Students",
            "GET",
            "students",
            200,
            token=self.admin_token
        )

        # Get specific student
        if student_id:
            success, _ = self.run_test(
                "Get Specific Student",
                "GET",
                f"students/{student_id}",
                200,
                token=self.admin_token
            )

        return success

    def test_classes_crud(self):
        """Test Classes CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token required for class operations")
            return False

        # Create class
        class_data = {
            "name": f"Test Class {datetime.now().strftime('%H%M%S')}",
            "level": "JSS1",
            "section": "B",
            "academic_year": "2025/2026"
        }
        
        success, response = self.run_test(
            "Create Class",
            "POST",
            "classes",
            200,
            data=class_data,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        class_id = response.get('id')
        if class_id:
            self.created_ids['classes'].append(class_id)

        # Get classes
        success, _ = self.run_test(
            "Get All Classes",
            "GET",
            "classes",
            200,
            token=self.admin_token
        )

        return success

    def test_grade_entry(self):
        """Test grade entry functionality"""
        if not self.teacher_token:
            print("❌ Teacher token required for grade operations")
            return False

        # Get teacher's subjects
        success, subjects = self.run_test(
            "Get Teacher Subjects",
            "GET",
            "subjects",
            200,
            token=self.teacher_token
        )

        if not success or not subjects:
            print("❌ No subjects found for teacher")
            return False

        subject_id = subjects[0]['id']
        class_id = subjects[0]['class_id']

        # Get students in class
        success, students = self.run_test(
            "Get Students in Class",
            "GET",
            f"students?class_id={class_id}",
            200,
            token=self.teacher_token
        )

        if not success or not students:
            print("❌ No students found in class")
            return False

        # Create grade entry
        grade_data = {
            "student_id": students[0]['id'],
            "subject_id": subject_id,
            "ca_score": 35.0,
            "exam_score": 55.0,
            "term": "first",
            "academic_year": "2025/2026",
            "comment": "Good performance"
        }

        success, _ = self.run_test(
            "Create Grade Entry",
            "POST",
            "grades",
            200,
            data=grade_data,
            token=self.teacher_token
        )

        return success

    def test_parent_results(self):
        """Test parent viewing results"""
        if not self.parent_token:
            print("❌ Parent token required for results viewing")
            return False

        # Get parent's children
        success, children = self.run_test(
            "Get Parent's Children",
            "GET",
            "students",
            200,
            token=self.parent_token
        )

        if not success:
            return False

        # Get grades for children
        success, _ = self.run_test(
            "Get Children's Grades",
            "GET",
            "grades?term=first",
            200,
            token=self.parent_token
        )

        return success

    def test_messaging_system(self):
        """Test messaging functionality"""
        if not self.admin_token or not self.teacher_token:
            print("❌ Admin and teacher tokens required for messaging")
            return False

        # Get users to send message to
        success, users = self.run_test(
            "Get Users for Messaging",
            "GET",
            "users?role=teacher",
            200,
            token=self.admin_token
        )

        if not success or not users:
            print("❌ No users found for messaging")
            return False

        # Send message
        message_data = {
            "recipient_id": users[0]['id'],
            "subject": "Test Message",
            "content": "This is a test message from API testing",
            "message_type": "direct"
        }

        success, _ = self.run_test(
            "Send Message",
            "POST",
            "messages",
            200,
            data=message_data,
            token=self.admin_token
        )

        # Get messages
        success, _ = self.run_test(
            "Get Messages",
            "GET",
            "messages",
            200,
            token=self.teacher_token
        )

        return success

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created students
        for student_id in self.created_ids['students']:
            self.run_test(
                f"Delete Student {student_id}",
                "DELETE",
                f"students/{student_id}",
                200,
                token=self.admin_token
            )

        # Delete created classes
        for class_id in self.created_ids['classes']:
            self.run_test(
                f"Delete Class {class_id}",
                "DELETE",
                f"classes/{class_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting QIRLLO API Testing...")
    tester = QirlloAPITester()

    # Test 1: Seed data
    print("\n" + "="*50)
    print("TESTING: Database Seeding")
    print("="*50)
    tester.test_seed_data()

    # Test 2: Authentication
    print("\n" + "="*50)
    print("TESTING: Authentication")
    print("="*50)
    
    admin_login = tester.test_login("admin@qirllo.com", "admin123", "admin")
    teacher_login = tester.test_login("okonkwo@qirllo.com", "teacher123", "teacher")
    parent_login = tester.test_login("ojo@gmail.com", "parent123", "parent")

    if not admin_login[0]:
        print("❌ Admin login failed - stopping tests")
        return 1

    # Test 3: Dashboard Stats
    print("\n" + "="*50)
    print("TESTING: Dashboard Stats")
    print("="*50)
    
    if admin_login[0]:
        tester.test_dashboard_stats(tester.admin_token, "admin")
    if teacher_login[0]:
        tester.test_dashboard_stats(tester.teacher_token, "teacher")
    if parent_login[0]:
        tester.test_dashboard_stats(tester.parent_token, "parent")

    # Test 4: Students CRUD
    print("\n" + "="*50)
    print("TESTING: Students CRUD Operations")
    print("="*50)
    tester.test_students_crud()

    # Test 5: Classes CRUD
    print("\n" + "="*50)
    print("TESTING: Classes CRUD Operations")
    print("="*50)
    tester.test_classes_crud()

    # Test 6: Grade Entry
    print("\n" + "="*50)
    print("TESTING: Grade Entry Functionality")
    print("="*50)
    if teacher_login[0]:
        tester.test_grade_entry()

    # Test 7: Parent Results
    print("\n" + "="*50)
    print("TESTING: Parent Results Viewing")
    print("="*50)
    if parent_login[0]:
        tester.test_parent_results()

    # Test 8: Messaging System
    print("\n" + "="*50)
    print("TESTING: Messaging System")
    print("="*50)
    tester.test_messaging_system()

    # Cleanup
    tester.cleanup_test_data()

    # Print results
    print("\n" + "="*50)
    print("TEST RESULTS SUMMARY")
    print("="*50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API testing completed successfully!")
        return 0
    else:
        print("⚠️  Backend API testing completed with issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())