import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/ui/stat-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { dashboardApi, announcementsApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  MessageSquare,
  Wallet,
  ArrowRight,
  Megaphone,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, announcementsRes] = await Promise.all([
        dashboardApi.getStats(),
        announcementsApi.getAll(),
      ]);
      setStats(statsRes.data);
      setAnnouncements(announcementsRes.data.slice(0, 3));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['admin']}>
        <div className="p-4 md:p-8 lg:p-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="admin-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to <strong>{user?.school_name || 'your school'}</strong>! Here's your overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Students"
            value={stats?.total_students || 0}
            icon={Users}
            data-testid="stat-students"
          />
          <StatCard
            title="Total Teachers"
            value={stats?.total_teachers || 0}
            icon={GraduationCap}
            data-testid="stat-teachers"
          />
          <StatCard
            title="Total Classes"
            value={stats?.total_classes || 0}
            icon={School}
            data-testid="stat-classes"
          />
          <StatCard
            title="Parents"
            value={stats?.total_parents || 0}
            icon={Users}
            data-testid="stat-parents"
          />
          <StatCard
            title="Pending Results"
            value={stats?.pending_grades || 0}
            icon={ClipboardCheck}
            className={stats?.pending_grades > 0 ? 'border-warning' : ''}
            data-testid="stat-pending"
          />
          <StatCard
            title="Unread Messages"
            value={stats?.unread_messages || 0}
            icon={MessageSquare}
            data-testid="stat-messages"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₦${(stats?.revenue || 0).toLocaleString()}`}
            icon={Wallet}
            className="col-span-2 md:col-span-1"
            data-testid="stat-revenue"
          />
        </div>

        {/* Quick Actions & Recent */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/admin/students">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-add-student">
                  Add New Student
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/admin/classes">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-manage-classes">
                  Manage Classes
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/admin/results">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-approve-results">
                  Approve Results
                  {stats?.pending_grades > 0 && (
                    <span className="badge-pending">{stats.pending_grades}</span>
                  )}
                </Button>
              </Link>
              <Link to="/admin/announcements">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-announcements">
                  Post Announcement
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Announcements</CardTitle>
              <Link to="/admin/announcements">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No announcements yet</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`announcement-card ${announcement.priority === 'high' ? 'high-priority' : ''}`}
                    >
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};
