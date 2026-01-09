import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Toaster } from './components/ui/sonner';

// Pages
import { Login } from './pages/Login';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Students } from './pages/admin/Students';
import { Classes } from './pages/admin/Classes';
import { Teachers } from './pages/admin/Teachers';
import { Subjects } from './pages/admin/Subjects';
import { ResultsApproval } from './pages/admin/ResultsApproval';
import { Messages } from './pages/admin/Messages';
import { Announcements } from './pages/admin/Announcements';
import { Fees } from './pages/admin/Fees';
import { BulkUpload } from './pages/admin/BulkUpload';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClasses } from './pages/teacher/TeacherClasses';
import { GradeEntry } from './pages/teacher/GradeEntry';
import { Attendance } from './pages/teacher/Attendance';

// Parent Pages
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { ParentResults } from './pages/parent/ParentResults';
import { ParentAnnouncements } from './pages/parent/ParentAnnouncements';
import { ParentAttendanceFees } from './pages/parent/AttendanceFees';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Home redirect based on role
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={`/${user.role}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Home Redirect */}
          <Route path="/" element={<HomeRedirect />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/admin/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
          <Route path="/admin/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/admin/results" element={<ProtectedRoute><ResultsApproval /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/classes" element={<ProtectedRoute><TeacherClasses /></ProtectedRoute>} />
          <Route path="/teacher/grades" element={<ProtectedRoute><GradeEntry /></ProtectedRoute>} />
          <Route path="/teacher/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          
          {/* Parent Routes */}
          <Route path="/parent" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/results" element={<ProtectedRoute><ParentResults /></ProtectedRoute>} />
          <Route path="/parent/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/parent/announcements" element={<ProtectedRoute><ParentAnnouncements /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
