import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/ui/stat-card';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { dashboardApi, classesApi, subjectsApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  School,
  BookOpen,
  Users,
  ClipboardCheck,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, classesRes, subjectsRes] = await Promise.all([
        dashboardApi.getStats(),
        classesApi.getAll(),
        subjectsApi.getAll(),
      ]);
      setStats(statsRes.data);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['teacher']}>
        <div className="p-4 md:p-8 lg:p-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['teacher']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="teacher-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to <strong>{user?.school_name || 'your school'}</strong>! Here's your overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="My Classes"
            value={stats?.total_classes || 0}
            icon={School}
            data-testid="stat-classes"
          />
          <StatCard
            title="My Subjects"
            value={stats?.total_subjects || 0}
            icon={BookOpen}
            data-testid="stat-subjects"
          />
          <StatCard
            title="Total Students"
            value={stats?.total_students || 0}
            icon={Users}
            data-testid="stat-students"
          />
          <StatCard
            title="Draft Grades"
            value={stats?.draft_grades || 0}
            icon={ClipboardCheck}
            className={stats?.draft_grades > 0 ? 'border-warning' : ''}
            data-testid="stat-drafts"
          />
        </div>

        {/* Quick Actions & Classes */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/teacher/grades">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-grade-entry">
                  Enter Grades
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/teacher/classes">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-view-classes">
                  View My Classes
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/teacher/messages">
                <Button variant="outline" className="w-full justify-between" data-testid="quick-messages">
                  Messages
                  {stats?.unread_messages > 0 && (
                    <span className="badge-pending">{stats.unread_messages}</span>
                  )}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* My Classes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Classes</CardTitle>
              <Link to="/teacher/classes">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No classes assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {classes.slice(0, 4).map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{cls.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {cls.student_count} students
                        </p>
                      </div>
                      <Link to={`/teacher/grades?class=${cls.id}`}>
                        <Button size="sm" variant="ghost">
                          <ClipboardCheck className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Subjects */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">My Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No subjects assigned yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {subjects.map((subject) => (
                  <Link
                    key={subject.id}
                    to={`/teacher/grades?subject=${subject.id}`}
                    className="p-4 border rounded-lg hover:border-primary transition-colors"
                  >
                    <h4 className="font-medium text-sm">{subject.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{subject.class_name}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
