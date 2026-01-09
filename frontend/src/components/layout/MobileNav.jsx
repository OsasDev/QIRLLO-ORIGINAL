import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  MessageSquare,
  Megaphone,
  School,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const adminTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/admin' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: School, label: 'Classes', path: '/admin/classes' },
  { icon: ClipboardCheck, label: 'Results', path: '/admin/results' },
  { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
];

const teacherTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/teacher' },
  { icon: School, label: 'Classes', path: '/teacher/classes' },
  { icon: ClipboardCheck, label: 'Grades', path: '/teacher/grades' },
  { icon: MessageSquare, label: 'Messages', path: '/teacher/messages' },
];

const parentTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/parent' },
  { icon: ClipboardCheck, label: 'Results', path: '/parent/results' },
  { icon: MessageSquare, label: 'Messages', path: '/parent/messages' },
  { icon: Megaphone, label: 'News', path: '/parent/announcements' },
];

export const MobileNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  const tabs = user?.role === 'admin' 
    ? adminTabs 
    : user?.role === 'teacher' 
    ? teacherTabs 
    : parentTabs;

  return (
    <nav className="mobile-nav lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 pb-safe">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
            (tab.path !== `/${user?.role}` && location.pathname.startsWith(tab.path));
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              data-testid={`mobile-nav-${tab.label.toLowerCase()}`}
              className={cn('mobile-tab', isActive && 'active')}
            >
              <tab.icon className={cn('w-5 h-5 mb-1', isActive && 'text-primary')} />
              <span className={cn(isActive && 'text-primary font-medium')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
