import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  ChevronRight,
  School,
  Wallet,
  Upload,
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: School, label: 'Classes', path: '/admin/classes' },
  { icon: GraduationCap, label: 'Teachers', path: '/admin/teachers' },
  { icon: BookOpen, label: 'Subjects', path: '/admin/subjects' },
  { icon: Calendar, label: 'Attendance', path: '/admin/attendance' },
  { icon: ClipboardCheck, label: 'Results Approval', path: '/admin/results' },
  { icon: Wallet, label: 'School Fees', path: '/admin/fees' },
  { icon: Upload, label: 'Bulk Upload', path: '/admin/upload' },
  { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
];

const teacherNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
  { icon: School, label: 'My Classes', path: '/teacher/classes' },
  { icon: Calendar, label: 'Attendance', path: '/teacher/attendance' },
  { icon: ClipboardCheck, label: 'Grade Entry', path: '/teacher/grades' },
  { icon: MessageSquare, label: 'Messages', path: '/teacher/messages' },
];

const parentNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/parent' },
  { icon: ClipboardCheck, label: 'Results', path: '/parent/results' },
  { icon: Calendar, label: 'Attendance & Fees', path: '/parent/attendance-fees' },
  { icon: MessageSquare, label: 'Messages', path: '/parent/messages' },
  { icon: Megaphone, label: 'Announcements', path: '/parent/announcements' },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = user?.role === 'admin' 
    ? adminNavItems 
    : user?.role === 'teacher' 
    ? teacherNavItems 
    : parentNavItems;

  return (
    <aside className="sidebar hidden lg:flex lg:flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">Q</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">QIRLLO</h1>
            <p className="text-xs text-muted-foreground">School Management</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== `/${user?.role}` && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'nav-item',
                isActive && 'active'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          data-testid="logout-btn"
          className="nav-item w-full text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
