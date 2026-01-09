import { useAuth } from '../../lib/auth';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';

export const DashboardLayout = ({ children, allowedRoles }) => {
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="dashboard-layout bg-background min-h-screen">
      <Sidebar />
      <MobileHeader />
      <main className="main-content">
        <div className="animate-fade-up">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};
