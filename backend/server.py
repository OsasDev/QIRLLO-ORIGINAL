from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date
import jwt
import bcrypt
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'qirllo-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="QIRLLO School Management API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = Field(..., pattern="^(admin|teacher|parent)$")
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class StudentCreate(BaseModel):
    full_name: str
    admission_number: str
    class_id: str
    gender: str = Field(..., pattern="^(male|female)$")
    date_of_birth: Optional[str] = None
    parent_id: Optional[str] = None
    address: Optional[str] = None

class StudentResponse(BaseModel):
    id: str
    full_name: str
    admission_number: str
    class_id: str
    class_name: Optional[str] = None
    gender: str
    date_of_birth: Optional[str] = None
    parent_id: Optional[str] = None
    address: Optional[str] = None
    created_at: str

class ClassCreate(BaseModel):
    name: str
    level: str = Field(..., pattern="^(JSS1|JSS2|JSS3|SS1|SS2|SS3)$")
    section: Optional[str] = "A"
    teacher_id: Optional[str] = None
    academic_year: str = "2025/2026"

class ClassResponse(BaseModel):
    id: str
    name: str
    level: str
    section: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    academic_year: str
    student_count: int = 0
    created_at: str

class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: str
    teacher_id: Optional[str] = None

class SubjectResponse(BaseModel):
    id: str
    name: str
    code: str
    class_id: str
    class_name: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: str

class GradeEntry(BaseModel):
    student_id: str
    subject_id: str
    ca_score: float = Field(..., ge=0, le=40)
    exam_score: float = Field(..., ge=0, le=60)
    term: str = Field(..., pattern="^(first|second|third)$")
    academic_year: str = "2025/2026"
    comment: Optional[str] = None

class GradeResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    subject_id: str
    subject_name: Optional[str] = None
    ca_score: float
    exam_score: float
    total_score: float
    grade: str
    term: str
    academic_year: str
    comment: Optional[str] = None
    status: str = "draft"
    teacher_id: Optional[str] = None
    created_at: str

class GradeBulkEntry(BaseModel):
    subject_id: str
    term: str
    academic_year: str = "2025/2026"
    grades: List[dict]

class MessageCreate(BaseModel):
    recipient_id: str
    subject: str
    content: str
    message_type: str = "direct"

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: Optional[str] = None
    recipient_id: str
    recipient_name: Optional[str] = None
    subject: str
    content: str
    message_type: str
    is_read: bool = False
    created_at: str

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: str = Field(..., pattern="^(all|teachers|parents|students)$")
    priority: str = "normal"

class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    target_audience: str
    priority: str
    author_id: str
    author_name: Optional[str] = None
    created_at: str

# ============ ATTENDANCE MODELS ============

class AttendanceEntry(BaseModel):
    student_id: str
    date: str
    status: str = Field(..., pattern="^(present|absent|late|excused)$")
    notes: Optional[str] = None

class AttendanceBulkEntry(BaseModel):
    class_id: str
    date: str
    records: List[dict]

class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    class_id: str
    class_name: Optional[str] = None
    date: str
    status: str
    notes: Optional[str] = None
    marked_by: Optional[str] = None
    created_at: str

# ============ FEES MODELS ============

class FeeStructure(BaseModel):
    class_level: str
    term: str
    academic_year: str = "2025/2026"
    tuition: float
    books: float = 0
    uniform: float = 0
    other_fees: float = 0
    total: Optional[float] = None

class FeePayment(BaseModel):
    student_id: str
    amount: float
    payment_method: str = Field(..., pattern="^(cash|transfer|card|pos)$")
    term: str
    academic_year: str = "2025/2026"
    receipt_number: Optional[str] = None
    notes: Optional[str] = None

class FeePaymentResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    amount: float
    payment_method: str
    term: str
    academic_year: str
    receipt_number: Optional[str] = None
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    created_at: str

class StudentFeeBalance(BaseModel):
    student_id: str
    student_name: str
    class_name: str
    total_fees: float
    total_paid: float
    balance: float
    payments: List[FeePaymentResponse]

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_grade(total: float) -> str:
    if total >= 70: return "A"
    elif total >= 60: return "B"
    elif total >= 50: return "C"
    elif total >= 45: return "D"
    elif total >= 40: return "E"
    else: return "F"

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            phone=user_data.phone,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            phone=user.get("phone"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        created_at=current_user["created_at"]
    )

# ============ USERS/TEACHERS ROUTES ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/teachers", response_model=List[UserResponse])
async def get_teachers(current_user: dict = Depends(get_current_user)):
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**t) for t in teachers]

@api_router.get("/parents", response_model=List[UserResponse])
async def get_parents(current_user: dict = Depends(get_current_user)):
    parents = await db.users.find({"role": "parent"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**p) for p in parents]

# ============ STUDENTS ROUTES ============

@api_router.post("/students", response_model=StudentResponse)
async def create_student(student_data: StudentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.students.find_one({"admission_number": student_data.admission_number})
    if existing:
        raise HTTPException(status_code=400, detail="Admission number already exists")
    
    student_id = str(uuid.uuid4())
    class_doc = await db.classes.find_one({"id": student_data.class_id}, {"_id": 0})
    
    student_doc = {
        "id": student_id,
        "full_name": student_data.full_name,
        "admission_number": student_data.admission_number,
        "class_id": student_data.class_id,
        "class_name": class_doc["name"] if class_doc else None,
        "gender": student_data.gender,
        "date_of_birth": student_data.date_of_birth,
        "parent_id": student_data.parent_id,
        "address": student_data.address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.students.insert_one(student_doc)
    return StudentResponse(**student_doc)

@api_router.get("/students", response_model=List[StudentResponse])
async def get_students(class_id: Optional[str] = None, parent_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    if parent_id:
        query["parent_id"] = parent_id
    if current_user["role"] == "parent":
        query["parent_id"] = current_user["id"]
    
    students = await db.students.find(query, {"_id": 0}).to_list(1000)
    return [StudentResponse(**s) for s in students]

@api_router.get("/students/csv-template")
async def get_csv_template():
    """Return a CSV template for student upload"""
    template = """full_name,admission_number,class,gender,date_of_birth,parent_email,address
John Doe,QRL/2025/0001,JSS1 A,male,2012-05-15,parent@email.com,123 Lagos Street
Jane Smith,QRL/2025/0002,JSS1 A,female,2012-08-20,parent2@email.com,456 Abuja Road"""
    
    return {"template": template, "fields": [
        {"name": "full_name", "required": True, "description": "Student's full name"},
        {"name": "admission_number", "required": True, "description": "Unique admission number"},
        {"name": "class", "required": False, "description": "Class name (e.g., JSS1 A)"},
        {"name": "gender", "required": False, "description": "male or female"},
        {"name": "date_of_birth", "required": False, "description": "YYYY-MM-DD format"},
        {"name": "parent_email", "required": False, "description": "Parent's registered email"},
        {"name": "address", "required": False, "description": "Student's address"}
    ]}

@api_router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse(**student)

@api_router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, student_data: StudentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    class_doc = await db.classes.find_one({"id": student_data.class_id}, {"_id": 0})
    update_data = student_data.model_dump()
    update_data["class_name"] = class_doc["name"] if class_doc else None
    
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    return StudentResponse(**student)

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}

# ============ CLASSES ROUTES ============

@api_router.post("/classes", response_model=ClassResponse)
async def create_class(class_data: ClassCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    class_id = str(uuid.uuid4())
    teacher_name = None
    if class_data.teacher_id:
        teacher = await db.users.find_one({"id": class_data.teacher_id}, {"_id": 0})
        teacher_name = teacher["full_name"] if teacher else None
    
    class_doc = {
        "id": class_id,
        "name": class_data.name,
        "level": class_data.level,
        "section": class_data.section,
        "teacher_id": class_data.teacher_id,
        "teacher_name": teacher_name,
        "academic_year": class_data.academic_year,
        "student_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.classes.insert_one(class_doc)
    return ClassResponse(**class_doc)

@api_router.get("/classes", response_model=List[ClassResponse])
async def get_classes(teacher_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if teacher_id:
        query["teacher_id"] = teacher_id
    if current_user["role"] == "teacher":
        # Get classes where teacher is assigned or teaches subjects
        subjects = await db.subjects.find({"teacher_id": current_user["id"]}, {"_id": 0}).to_list(1000)
        class_ids = list(set([s["class_id"] for s in subjects]))
        query = {"$or": [{"teacher_id": current_user["id"]}, {"id": {"$in": class_ids}}]}
    
    classes = await db.classes.find(query, {"_id": 0}).to_list(1000)
    
    # Update student counts
    for cls in classes:
        count = await db.students.count_documents({"class_id": cls["id"]})
        cls["student_count"] = count
    
    return [ClassResponse(**c) for c in classes]

@api_router.get("/classes/{class_id}", response_model=ClassResponse)
async def get_class(class_id: str, current_user: dict = Depends(get_current_user)):
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    count = await db.students.count_documents({"class_id": class_id})
    cls["student_count"] = count
    return ClassResponse(**cls)

@api_router.put("/classes/{class_id}", response_model=ClassResponse)
async def update_class(class_id: str, class_data: ClassCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    teacher_name = None
    if class_data.teacher_id:
        teacher = await db.users.find_one({"id": class_data.teacher_id}, {"_id": 0})
        teacher_name = teacher["full_name"] if teacher else None
    
    update_data = class_data.model_dump()
    update_data["teacher_name"] = teacher_name
    
    await db.classes.update_one({"id": class_id}, {"$set": update_data})
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    count = await db.students.count_documents({"class_id": class_id})
    cls["student_count"] = count
    return ClassResponse(**cls)

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.classes.delete_one({"id": class_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"message": "Class deleted successfully"}

# ============ SUBJECTS ROUTES ============

@api_router.post("/subjects", response_model=SubjectResponse)
async def create_subject(subject_data: SubjectCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    subject_id = str(uuid.uuid4())
    class_doc = await db.classes.find_one({"id": subject_data.class_id}, {"_id": 0})
    teacher_name = None
    if subject_data.teacher_id:
        teacher = await db.users.find_one({"id": subject_data.teacher_id}, {"_id": 0})
        teacher_name = teacher["full_name"] if teacher else None
    
    subject_doc = {
        "id": subject_id,
        "name": subject_data.name,
        "code": subject_data.code,
        "class_id": subject_data.class_id,
        "class_name": class_doc["name"] if class_doc else None,
        "teacher_id": subject_data.teacher_id,
        "teacher_name": teacher_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subjects.insert_one(subject_doc)
    return SubjectResponse(**subject_doc)

@api_router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(class_id: Optional[str] = None, teacher_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    if teacher_id:
        query["teacher_id"] = teacher_id
    if current_user["role"] == "teacher":
        query["teacher_id"] = current_user["id"]
    
    subjects = await db.subjects.find(query, {"_id": 0}).to_list(1000)
    return [SubjectResponse(**s) for s in subjects]

@api_router.put("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(subject_id: str, subject_data: SubjectCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    class_doc = await db.classes.find_one({"id": subject_data.class_id}, {"_id": 0})
    teacher_name = None
    if subject_data.teacher_id:
        teacher = await db.users.find_one({"id": subject_data.teacher_id}, {"_id": 0})
        teacher_name = teacher["full_name"] if teacher else None
    
    update_data = subject_data.model_dump()
    update_data["class_name"] = class_doc["name"] if class_doc else None
    update_data["teacher_name"] = teacher_name
    
    await db.subjects.update_one({"id": subject_id}, {"$set": update_data})
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    return SubjectResponse(**subject)

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subjects.delete_one({"id": subject_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted successfully"}

# ============ GRADES ROUTES ============

@api_router.post("/grades", response_model=GradeResponse)
async def create_grade(grade_data: GradeEntry, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if grade already exists
    existing = await db.grades.find_one({
        "student_id": grade_data.student_id,
        "subject_id": grade_data.subject_id,
        "term": grade_data.term,
        "academic_year": grade_data.academic_year
    })
    
    total_score = grade_data.ca_score + grade_data.exam_score
    grade_letter = calculate_grade(total_score)
    
    student = await db.students.find_one({"id": grade_data.student_id}, {"_id": 0})
    subject = await db.subjects.find_one({"id": grade_data.subject_id}, {"_id": 0})
    
    grade_doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "student_id": grade_data.student_id,
        "student_name": student["full_name"] if student else None,
        "subject_id": grade_data.subject_id,
        "subject_name": subject["name"] if subject else None,
        "ca_score": grade_data.ca_score,
        "exam_score": grade_data.exam_score,
        "total_score": total_score,
        "grade": grade_letter,
        "term": grade_data.term,
        "academic_year": grade_data.academic_year,
        "comment": grade_data.comment,
        "status": "draft",
        "teacher_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.grades.update_one({"id": existing["id"]}, {"$set": grade_doc})
    else:
        await db.grades.insert_one(grade_doc)
    
    return GradeResponse(**grade_doc)

@api_router.post("/grades/bulk", response_model=List[GradeResponse])
async def create_grades_bulk(bulk_data: GradeBulkEntry, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    subject = await db.subjects.find_one({"id": bulk_data.subject_id}, {"_id": 0})
    results = []
    
    for grade in bulk_data.grades:
        total_score = grade["ca_score"] + grade["exam_score"]
        grade_letter = calculate_grade(total_score)
        student = await db.students.find_one({"id": grade["student_id"]}, {"_id": 0})
        
        existing = await db.grades.find_one({
            "student_id": grade["student_id"],
            "subject_id": bulk_data.subject_id,
            "term": bulk_data.term,
            "academic_year": bulk_data.academic_year
        })
        
        grade_doc = {
            "id": existing["id"] if existing else str(uuid.uuid4()),
            "student_id": grade["student_id"],
            "student_name": student["full_name"] if student else None,
            "subject_id": bulk_data.subject_id,
            "subject_name": subject["name"] if subject else None,
            "ca_score": grade["ca_score"],
            "exam_score": grade["exam_score"],
            "total_score": total_score,
            "grade": grade_letter,
            "term": bulk_data.term,
            "academic_year": bulk_data.academic_year,
            "comment": grade.get("comment"),
            "status": "draft",
            "teacher_id": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.grades.update_one({"id": existing["id"]}, {"$set": grade_doc})
        else:
            await db.grades.insert_one(grade_doc)
        
        results.append(GradeResponse(**grade_doc))
    
    return results

@api_router.get("/grades", response_model=List[GradeResponse])
async def get_grades(
    student_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    class_id: Optional[str] = None,
    term: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if subject_id:
        query["subject_id"] = subject_id
    if term:
        query["term"] = term
    if status:
        query["status"] = status
    
    if class_id:
        students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
        student_ids = [s["id"] for s in students]
        query["student_id"] = {"$in": student_ids}
    
    if current_user["role"] == "parent":
        children = await db.students.find({"parent_id": current_user["id"]}, {"_id": 0}).to_list(100)
        child_ids = [c["id"] for c in children]
        query["student_id"] = {"$in": child_ids}
        query["status"] = "approved"
    
    grades = await db.grades.find(query, {"_id": 0}).to_list(1000)
    return [GradeResponse(**g) for g in grades]

@api_router.put("/grades/{grade_id}/submit")
async def submit_grade(grade_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.grades.update_one({"id": grade_id}, {"$set": {"status": "submitted"}})
    return {"message": "Grade submitted for approval"}

@api_router.put("/grades/submit-bulk")
async def submit_grades_bulk(subject_id: str, term: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.grades.update_many(
        {"subject_id": subject_id, "term": term, "status": "draft"},
        {"$set": {"status": "submitted"}}
    )
    return {"message": "Grades submitted for approval"}

@api_router.put("/grades/{grade_id}/approve")
async def approve_grade(grade_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.grades.update_one({"id": grade_id}, {"$set": {"status": "approved"}})
    return {"message": "Grade approved"}

@api_router.put("/grades/approve-bulk")
async def approve_grades_bulk(subject_id: Optional[str] = None, class_id: Optional[str] = None, term: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {"status": "submitted"}
    if subject_id:
        query["subject_id"] = subject_id
    if term:
        query["term"] = term
    if class_id:
        students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
        student_ids = [s["id"] for s in students]
        query["student_id"] = {"$in": student_ids}
    
    result = await db.grades.update_many(query, {"$set": {"status": "approved"}})
    return {"message": f"{result.modified_count} grades approved"}

# ============ MESSAGES ROUTES ============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_id = str(uuid.uuid4())
    recipient = await db.users.find_one({"id": message_data.recipient_id}, {"_id": 0})
    
    message_doc = {
        "id": message_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["full_name"],
        "recipient_id": message_data.recipient_id,
        "recipient_name": recipient["full_name"] if recipient else None,
        "subject": message_data.subject,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message_doc)
    return MessageResponse(**message_doc)

@api_router.get("/messages", response_model=List[MessageResponse])
async def get_messages(folder: str = "inbox", current_user: dict = Depends(get_current_user)):
    if folder == "inbox":
        query = {"recipient_id": current_user["id"]}
    else:
        query = {"sender_id": current_user["id"]}
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [MessageResponse(**m) for m in messages]

@api_router.get("/messages/{message_id}", response_model=MessageResponse)
async def get_message(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Mark as read if recipient
    if message["recipient_id"] == current_user["id"] and not message["is_read"]:
        await db.messages.update_one({"id": message_id}, {"$set": {"is_read": True}})
        message["is_read"] = True
    
    return MessageResponse(**message)

@api_router.get("/messages/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"recipient_id": current_user["id"], "is_read": False})
    return {"count": count}

# ============ ANNOUNCEMENTS ROUTES ============

@api_router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(announcement_data: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    announcement_id = str(uuid.uuid4())
    announcement_doc = {
        "id": announcement_id,
        "title": announcement_data.title,
        "content": announcement_data.content,
        "target_audience": announcement_data.target_audience,
        "priority": announcement_data.priority,
        "author_id": current_user["id"],
        "author_name": current_user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.announcements.insert_one(announcement_doc)
    return AnnouncementResponse(**announcement_doc)

@api_router.get("/announcements", response_model=List[AnnouncementResponse])
async def get_announcements(current_user: dict = Depends(get_current_user)):
    role_map = {"admin": "all", "teacher": "teachers", "parent": "parents"}
    user_audience = role_map.get(current_user["role"], "all")
    
    query = {"$or": [{"target_audience": "all"}, {"target_audience": user_audience}]}
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AnnouncementResponse(**a) for a in announcements]

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.announcements.delete_one({"id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}

# ============ ATTENDANCE ROUTES ============

@api_router.post("/attendance", response_model=AttendanceResponse)
async def mark_attendance(entry: AttendanceEntry, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    student = await db.students.find_one({"id": entry.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if attendance already exists for this date
    existing = await db.attendance.find_one({
        "student_id": entry.student_id,
        "date": entry.date
    })
    
    attendance_id = existing["id"] if existing else str(uuid.uuid4())
    attendance_doc = {
        "id": attendance_id,
        "student_id": entry.student_id,
        "student_name": student["full_name"],
        "class_id": student["class_id"],
        "class_name": student.get("class_name"),
        "date": entry.date,
        "status": entry.status,
        "notes": entry.notes,
        "marked_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.attendance.update_one({"id": existing["id"]}, {"$set": attendance_doc})
    else:
        await db.attendance.insert_one(attendance_doc)
    
    return AttendanceResponse(**attendance_doc)

@api_router.post("/attendance/bulk", response_model=List[AttendanceResponse])
async def mark_attendance_bulk(bulk_entry: AttendanceBulkEntry, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    class_doc = await db.classes.find_one({"id": bulk_entry.class_id}, {"_id": 0})
    results = []
    
    for record in bulk_entry.records:
        student = await db.students.find_one({"id": record["student_id"]}, {"_id": 0})
        if not student:
            continue
        
        existing = await db.attendance.find_one({
            "student_id": record["student_id"],
            "date": bulk_entry.date
        })
        
        attendance_id = existing["id"] if existing else str(uuid.uuid4())
        attendance_doc = {
            "id": attendance_id,
            "student_id": record["student_id"],
            "student_name": student["full_name"],
            "class_id": bulk_entry.class_id,
            "class_name": class_doc["name"] if class_doc else None,
            "date": bulk_entry.date,
            "status": record["status"],
            "notes": record.get("notes"),
            "marked_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.attendance.update_one({"id": existing["id"]}, {"$set": attendance_doc})
        else:
            await db.attendance.insert_one(attendance_doc)
        
        results.append(AttendanceResponse(**attendance_doc))
    
    return results

@api_router.get("/attendance", response_model=List[AttendanceResponse])
async def get_attendance(
    class_id: Optional[str] = None,
    student_id: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if class_id:
        query["class_id"] = class_id
    if student_id:
        query["student_id"] = student_id
    if date:
        query["date"] = date
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    if current_user["role"] == "parent":
        children = await db.students.find({"parent_id": current_user["id"]}, {"_id": 0}).to_list(100)
        child_ids = [c["id"] for c in children]
        query["student_id"] = {"$in": child_ids}
    
    if current_user["role"] == "teacher":
        subjects = await db.subjects.find({"teacher_id": current_user["id"]}, {"_id": 0}).to_list(100)
        class_ids = list(set([s["class_id"] for s in subjects]))
        if not class_id:
            query["class_id"] = {"$in": class_ids}
    
    attendance = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [AttendanceResponse(**a) for a in attendance]

@api_router.get("/attendance/summary/{student_id}")
async def get_attendance_summary(student_id: str, term: Optional[str] = "first", current_user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check access for parents
    if current_user["role"] == "parent":
        if student.get("parent_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    attendance = await db.attendance.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    
    total_days = len(attendance)
    present = len([a for a in attendance if a["status"] == "present"])
    absent = len([a for a in attendance if a["status"] == "absent"])
    late = len([a for a in attendance if a["status"] == "late"])
    excused = len([a for a in attendance if a["status"] == "excused"])
    
    attendance_rate = (present + late) / total_days * 100 if total_days > 0 else 0
    
    return {
        "student_id": student_id,
        "student_name": student["full_name"],
        "class_name": student.get("class_name"),
        "total_days": total_days,
        "present": present,
        "absent": absent,
        "late": late,
        "excused": excused,
        "attendance_rate": round(attendance_rate, 1)
    }

# ============ FEES ROUTES ============

@api_router.post("/fees/structure")
async def create_fee_structure(fee: FeeStructure, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total = fee.tuition + fee.books + fee.uniform + fee.other_fees
    
    fee_id = str(uuid.uuid4())
    fee_doc = {
        "id": fee_id,
        "class_level": fee.class_level,
        "term": fee.term,
        "academic_year": fee.academic_year,
        "tuition": fee.tuition,
        "books": fee.books,
        "uniform": fee.uniform,
        "other_fees": fee.other_fees,
        "total": total,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert fee structure
    await db.fee_structures.update_one(
        {"class_level": fee.class_level, "term": fee.term, "academic_year": fee.academic_year},
        {"$set": fee_doc},
        upsert=True
    )
    
    return fee_doc

@api_router.get("/fees/structure")
async def get_fee_structures(class_level: Optional[str] = None, term: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if class_level:
        query["class_level"] = class_level
    if term:
        query["term"] = term
    
    structures = await db.fee_structures.find(query, {"_id": 0}).to_list(100)
    return structures

@api_router.post("/fees/payment", response_model=FeePaymentResponse)
async def record_fee_payment(payment: FeePayment, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    student = await db.students.find_one({"id": payment.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    payment_id = str(uuid.uuid4())
    receipt_number = payment.receipt_number or f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_id[:8].upper()}"
    
    payment_doc = {
        "id": payment_id,
        "student_id": payment.student_id,
        "student_name": student["full_name"],
        "class_name": student.get("class_name"),
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "term": payment.term,
        "academic_year": payment.academic_year,
        "receipt_number": receipt_number,
        "notes": payment.notes,
        "recorded_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.fee_payments.insert_one(payment_doc)
    return FeePaymentResponse(**payment_doc)

@api_router.get("/fees/payments", response_model=List[FeePaymentResponse])
async def get_fee_payments(
    student_id: Optional[str] = None,
    term: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if term:
        query["term"] = term
    
    if current_user["role"] == "parent":
        children = await db.students.find({"parent_id": current_user["id"]}, {"_id": 0}).to_list(100)
        child_ids = [c["id"] for c in children]
        query["student_id"] = {"$in": child_ids}
    
    payments = await db.fee_payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [FeePaymentResponse(**p) for p in payments]

@api_router.get("/fees/balance/{student_id}", response_model=StudentFeeBalance)
async def get_student_fee_balance(student_id: str, term: str = "first", current_user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check access for parents
    if current_user["role"] == "parent":
        if student.get("parent_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get class level from class name (e.g., "JSS1 A" -> "JSS1")
    class_doc = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})
    class_level = class_doc["level"] if class_doc else "JSS1"
    
    # Get fee structure
    fee_structure = await db.fee_structures.find_one({
        "class_level": class_level,
        "term": term
    }, {"_id": 0})
    
    total_fees = fee_structure["total"] if fee_structure else 50000  # Default ₦50,000
    
    # Get payments for this student and term
    payments = await db.fee_payments.find({
        "student_id": student_id,
        "term": term
    }, {"_id": 0}).to_list(100)
    
    total_paid = sum(p["amount"] for p in payments)
    balance = total_fees - total_paid
    
    return StudentFeeBalance(
        student_id=student_id,
        student_name=student["full_name"],
        class_name=student.get("class_name", ""),
        total_fees=total_fees,
        total_paid=total_paid,
        balance=balance,
        payments=[FeePaymentResponse(**p) for p in payments]
    )

@api_router.get("/fees/balances")
async def get_all_fee_balances(class_id: Optional[str] = None, term: str = "first", current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if class_id:
        query["class_id"] = class_id
    
    students = await db.students.find(query, {"_id": 0}).to_list(1000)
    balances = []
    
    for student in students:
        class_doc = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})
        class_level = class_doc["level"] if class_doc else "JSS1"
        
        fee_structure = await db.fee_structures.find_one({
            "class_level": class_level,
            "term": term
        }, {"_id": 0})
        
        total_fees = fee_structure["total"] if fee_structure else 50000
        
        payments = await db.fee_payments.find({
            "student_id": student["id"],
            "term": term
        }, {"_id": 0}).to_list(100)
        
        total_paid = sum(p["amount"] for p in payments)
        balance = total_fees - total_paid
        
        balances.append({
            "student_id": student["id"],
            "student_name": student["full_name"],
            "admission_number": student["admission_number"],
            "class_name": student.get("class_name"),
            "total_fees": total_fees,
            "total_paid": total_paid,
            "balance": balance,
            "status": "paid" if balance <= 0 else "partial" if total_paid > 0 else "unpaid"
        })
    
    return balances

# ============ CSV UPLOAD ROUTES ============

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent deleting self
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.post("/users/upload-parents-csv")
async def upload_parents_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            full_name = row.get('full_name', '').strip()
            email = row.get('email', '').strip()
            phone = row.get('phone', '').strip()
            password = row.get('password', 'parent123').strip()
            
            if not full_name or not email:
                errors.append(f"Row {row_num}: Missing required fields (full_name or email)")
                continue
            
            # Check if email exists
            existing = await db.users.find_one({"email": email})
            if existing:
                errors.append(f"Row {row_num}: Email {email} already exists")
                continue
            
            user_id = str(uuid.uuid4())
            user_doc = {
                "id": user_id,
                "email": email,
                "password_hash": hash_password(password),
                "full_name": full_name,
                "role": "parent",
                "phone": phone or None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(user_doc)
            
            # Link children if student_admission_numbers provided
            student_admissions = row.get('student_admission_numbers', '').strip()
            if student_admissions:
                for admission in student_admissions.split(';'):
                    admission = admission.strip()
                    if admission:
                        await db.students.update_one(
                            {"admission_number": admission},
                            {"$set": {"parent_id": user_id}}
                        )
            
            created += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {"message": f"Successfully created {created} parent accounts", "created": created, "errors": errors}

@api_router.get("/users/parents-csv-template")
async def get_parents_csv_template():
    template = """full_name,email,phone,password,student_admission_numbers
Mr. Ojo Adewale,parent@email.com,+234 801 234 5678,parent123,QRL/2025/0001;QRL/2025/0002
Mrs. Nwosu Chidinma,parent2@email.com,+234 802 345 6789,parent123,QRL/2025/0003"""
    
    return {"template": template, "fields": [
        {"name": "full_name", "required": True, "description": "Parent's full name"},
        {"name": "email", "required": True, "description": "Parent's email (used for login)"},
        {"name": "phone", "required": False, "description": "Phone number"},
        {"name": "password", "required": False, "description": "Password (default: parent123)"},
        {"name": "student_admission_numbers", "required": False, "description": "Student admission numbers separated by semicolon"}
    ]}

@api_router.post("/fees/upload-payments-csv")
async def upload_payments_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            admission_number = row.get('admission_number', '').strip()
            amount = row.get('amount', '').strip()
            payment_method = row.get('payment_method', 'transfer').strip().lower()
            term = row.get('term', 'first').strip().lower()
            
            if not admission_number or not amount:
                errors.append(f"Row {row_num}: Missing required fields (admission_number or amount)")
                continue
            
            # Find student
            student = await db.students.find_one({"admission_number": admission_number}, {"_id": 0})
            if not student:
                errors.append(f"Row {row_num}: Student {admission_number} not found")
                continue
            
            try:
                amount_float = float(amount)
            except ValueError:
                errors.append(f"Row {row_num}: Invalid amount {amount}")
                continue
            
            payment_id = str(uuid.uuid4())
            receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_id[:8].upper()}"
            
            payment_doc = {
                "id": payment_id,
                "student_id": student["id"],
                "student_name": student["full_name"],
                "class_name": student.get("class_name"),
                "amount": amount_float,
                "payment_method": payment_method if payment_method in ["cash", "transfer", "card", "pos"] else "transfer",
                "term": term if term in ["first", "second", "third"] else "first",
                "academic_year": "2025/2026",
                "receipt_number": receipt_number,
                "notes": row.get('notes', '').strip() or None,
                "recorded_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.fee_payments.insert_one(payment_doc)
            created += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {"message": f"Successfully recorded {created} payments", "created": created, "errors": errors}

@api_router.get("/fees/payments-csv-template")
async def get_payments_csv_template():
    template = """admission_number,amount,payment_method,term,notes
QRL/2025/0001,50000,transfer,first,First term full payment
QRL/2025/0002,25000,cash,first,Partial payment
QRL/2025/0003,50000,pos,first,"""
    
    return {"template": template, "fields": [
        {"name": "admission_number", "required": True, "description": "Student's admission number"},
        {"name": "amount", "required": True, "description": "Payment amount in Naira"},
        {"name": "payment_method", "required": False, "description": "cash, transfer, card, or pos (default: transfer)"},
        {"name": "term", "required": False, "description": "first, second, or third (default: first)"},
        {"name": "notes", "required": False, "description": "Payment notes"}
    ]}

@api_router.post("/students/upload-csv")
async def upload_students_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    created = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            # Required fields
            full_name = row.get('full_name', '').strip()
            admission_number = row.get('admission_number', '').strip()
            class_name = row.get('class', '').strip()
            gender = row.get('gender', 'male').strip().lower()
            
            if not full_name or not admission_number:
                errors.append(f"Row {row_num}: Missing required fields (full_name or admission_number)")
                continue
            
            # Check if admission number exists
            existing = await db.students.find_one({"admission_number": admission_number})
            if existing:
                errors.append(f"Row {row_num}: Admission number {admission_number} already exists")
                continue
            
            # Find or create class
            class_doc = await db.classes.find_one({"name": class_name}, {"_id": 0})
            if not class_doc:
                # Try to match by level
                level_match = None
                for level in ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]:
                    if level in class_name.upper():
                        level_match = level
                        break
                
                if level_match:
                    class_doc = await db.classes.find_one({"level": level_match}, {"_id": 0})
            
            class_id = class_doc["id"] if class_doc else None
            
            # Find parent by email if provided
            parent_email = row.get('parent_email', '').strip()
            parent_id = None
            if parent_email:
                parent = await db.users.find_one({"email": parent_email, "role": "parent"}, {"_id": 0})
                if parent:
                    parent_id = parent["id"]
            
            student_id = str(uuid.uuid4())
            student_doc = {
                "id": student_id,
                "full_name": full_name,
                "admission_number": admission_number,
                "class_id": class_id,
                "class_name": class_doc["name"] if class_doc else class_name,
                "gender": gender if gender in ["male", "female"] else "male",
                "date_of_birth": row.get('date_of_birth', '').strip() or None,
                "parent_id": parent_id,
                "address": row.get('address', '').strip() or None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.students.insert_one(student_doc)
            created += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Successfully created {created} students",
        "created": created,
        "errors": errors
    }

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        total_students = await db.students.count_documents({})
        total_teachers = await db.users.count_documents({"role": "teacher"})
        total_parents = await db.users.count_documents({"role": "parent"})
        total_classes = await db.classes.count_documents({})
        pending_grades = await db.grades.count_documents({"status": "submitted"})
        unread_messages = await db.messages.count_documents({"recipient_id": current_user["id"], "is_read": False})
        
        # Get fee collection stats
        total_fees_collected = 0
        fee_payments = await db.fee_payments.find({}, {"_id": 0, "amount": 1}).to_list(10000)
        total_fees_collected = sum(p["amount"] for p in fee_payments)
        
        # Today's attendance
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_attendance = await db.attendance.count_documents({"date": today})
        
        return {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_parents": total_parents,
            "total_classes": total_classes,
            "pending_grades": pending_grades,
            "unread_messages": unread_messages,
            "revenue": total_students * 1000,  # ₦1,000 per student
            "fees_collected": total_fees_collected,
            "attendance_today": today_attendance
        }
    
    elif current_user["role"] == "teacher":
        subjects = await db.subjects.find({"teacher_id": current_user["id"]}, {"_id": 0}).to_list(100)
        class_ids = list(set([s["class_id"] for s in subjects]))
        total_students = await db.students.count_documents({"class_id": {"$in": class_ids}})
        draft_grades = await db.grades.count_documents({"teacher_id": current_user["id"], "status": "draft"})
        unread_messages = await db.messages.count_documents({"recipient_id": current_user["id"], "is_read": False})
        
        # Today's attendance for teacher's classes
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_attendance = await db.attendance.count_documents({"class_id": {"$in": class_ids}, "date": today})
        
        return {
            "total_classes": len(class_ids),
            "total_subjects": len(subjects),
            "total_students": total_students,
            "draft_grades": draft_grades,
            "unread_messages": unread_messages,
            "attendance_today": today_attendance
        }
    
    elif current_user["role"] == "parent":
        children = await db.students.find({"parent_id": current_user["id"]}, {"_id": 0}).to_list(100)
        child_ids = [c["id"] for c in children]
        results_count = await db.grades.count_documents({"student_id": {"$in": child_ids}, "status": "approved"})
        unread_messages = await db.messages.count_documents({"recipient_id": current_user["id"], "is_read": False})
        announcements = await db.announcements.count_documents({"$or": [{"target_audience": "all"}, {"target_audience": "parents"}]})
        
        # Get fee balances for children
        total_balance = 0
        for child in children:
            payments = await db.fee_payments.find({"student_id": child["id"]}, {"_id": 0}).to_list(100)
            paid = sum(p["amount"] for p in payments)
            total_balance += max(0, 50000 - paid)  # Default fee of ₦50,000
        
        return {
            "total_children": len(children),
            "results_available": results_count,
            "unread_messages": unread_messages,
            "announcements": announcements,
            "children": children,
            "fee_balance": total_balance
        }
    
    return {}

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_database():
    """Seed database with Nigerian school sample data"""
    # Check if already seeded
    existing = await db.users.find_one({"email": "admin@qirllo.com"})
    if existing:
        return {"message": "Database already seeded"}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": "admin@qirllo.com",
        "password_hash": hash_password("admin123"),
        "full_name": "Mrs. Adebayo Folake",
        "role": "admin",
        "phone": "+234 801 234 5678",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    
    # Create teachers
    teachers = [
        {"name": "Mr. Okonkwo Chukwuemeka", "email": "okonkwo@qirllo.com", "phone": "+234 802 345 6789"},
        {"name": "Mrs. Adesanya Bimpe", "email": "adesanya@qirllo.com", "phone": "+234 803 456 7890"},
        {"name": "Mr. Ibrahim Musa", "email": "ibrahim@qirllo.com", "phone": "+234 804 567 8901"},
    ]
    teacher_ids = []
    for t in teachers:
        tid = str(uuid.uuid4())
        teacher_ids.append(tid)
        await db.users.insert_one({
            "id": tid,
            "email": t["email"],
            "password_hash": hash_password("teacher123"),
            "full_name": t["name"],
            "role": "teacher",
            "phone": t["phone"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create parents
    parents = [
        {"name": "Mr. Ojo Adewale", "email": "ojo@gmail.com", "phone": "+234 805 678 9012"},
        {"name": "Mrs. Nwosu Chidinma", "email": "nwosu@gmail.com", "phone": "+234 806 789 0123"},
        {"name": "Mr. Yusuf Abdullahi", "email": "yusuf@gmail.com", "phone": "+234 807 890 1234"},
    ]
    parent_ids = []
    for p in parents:
        pid = str(uuid.uuid4())
        parent_ids.append(pid)
        await db.users.insert_one({
            "id": pid,
            "email": p["email"],
            "password_hash": hash_password("parent123"),
            "full_name": p["name"],
            "role": "parent",
            "phone": p["phone"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create classes
    class_levels = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]
    class_ids = []
    for i, level in enumerate(class_levels):
        cid = str(uuid.uuid4())
        class_ids.append(cid)
        await db.classes.insert_one({
            "id": cid,
            "name": f"{level} A",
            "level": level,
            "section": "A",
            "teacher_id": teacher_ids[i % len(teacher_ids)],
            "teacher_name": teachers[i % len(teachers)]["name"],
            "academic_year": "2025/2026",
            "student_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Nigerian subjects
    subjects_list = [
        {"name": "Mathematics", "code": "MTH"},
        {"name": "English Language", "code": "ENG"},
        {"name": "Yoruba", "code": "YOR"},
        {"name": "Civic Education", "code": "CIV"},
        {"name": "Basic Science", "code": "BSC"},
        {"name": "Social Studies", "code": "SOC"},
        {"name": "Computer Studies", "code": "ICT"},
        {"name": "Agricultural Science", "code": "AGR"},
    ]
    
    subject_ids = []
    for cid in class_ids[:3]:  # Just for JSS classes
        for j, subj in enumerate(subjects_list):
            sid = str(uuid.uuid4())
            subject_ids.append({"id": sid, "class_id": cid})
            await db.subjects.insert_one({
                "id": sid,
                "name": subj["name"],
                "code": subj["code"],
                "class_id": cid,
                "teacher_id": teacher_ids[j % len(teacher_ids)],
                "teacher_name": teachers[j % len(teachers)]["name"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create students
    student_names = [
        "Adebayo Oluwaseun", "Okonkwo Chisom", "Ibrahim Fatima", "Nwosu Chinedu",
        "Yusuf Aisha", "Adekunle Temitope", "Obi Nneka", "Bello Aminu",
        "Okoro Ifeanyi", "Adeleke Titilayo", "Mohammed Halima", "Eze Obiora"
    ]
    
    student_ids = []
    for i, name in enumerate(student_names):
        stid = str(uuid.uuid4())
        student_ids.append(stid)
        class_idx = i % len(class_ids[:3])
        parent_idx = i % len(parent_ids)
        
        class_doc = await db.classes.find_one({"id": class_ids[class_idx]}, {"_id": 0})
        
        await db.students.insert_one({
            "id": stid,
            "full_name": name,
            "admission_number": f"QRL/2025/{str(i+1).zfill(4)}",
            "class_id": class_ids[class_idx],
            "class_name": class_doc["name"],
            "gender": "male" if i % 2 == 0 else "female",
            "parent_id": parent_ids[parent_idx],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create some sample grades
    import random
    for student_id in student_ids[:6]:
        student = await db.students.find_one({"id": student_id}, {"_id": 0})
        class_subjects = [s for s in subject_ids if s["class_id"] == student["class_id"]]
        
        for subj in class_subjects[:4]:
            ca = random.randint(20, 40)
            exam = random.randint(30, 60)
            total = ca + exam
            
            await db.grades.insert_one({
                "id": str(uuid.uuid4()),
                "student_id": student_id,
                "student_name": student["full_name"],
                "subject_id": subj["id"],
                "ca_score": ca,
                "exam_score": exam,
                "total_score": total,
                "grade": calculate_grade(total),
                "term": "first",
                "academic_year": "2025/2026",
                "status": "approved",
                "teacher_id": teacher_ids[0],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create announcements
    await db.announcements.insert_one({
        "id": str(uuid.uuid4()),
        "title": "Welcome to 2025/2026 Academic Session",
        "content": "We welcome all students, parents, and staff to the new academic year. Let's make it a successful one!",
        "target_audience": "all",
        "priority": "high",
        "author_id": admin_id,
        "author_name": "Mrs. Adebayo Folake",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.announcements.insert_one({
        "id": str(uuid.uuid4()),
        "title": "First Term Examination Schedule",
        "content": "First term examinations will begin on December 10th, 2025. All students are advised to prepare adequately.",
        "target_audience": "all",
        "priority": "normal",
        "author_id": admin_id,
        "author_name": "Mrs. Adebayo Folake",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Database seeded successfully", "admin_email": "admin@qirllo.com", "admin_password": "admin123"}

@api_router.get("/")
async def root():
    return {"message": "QIRLLO School Management API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
