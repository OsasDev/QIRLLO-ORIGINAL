import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { dashboardApi, announcementsApi, gradesApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  Users,
  ClipboardCheck,
  MessageSquare,
  Megaphone,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

export const ParentDashboard = () => {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, announcementsRes, gradesRes] = await Promise.all([
        dashboardApi.getStats(),
        announcementsApi.getAll(),
        gradesApi.getAll(),
      ]);
      setStats(statsRes.data);
      setAnnouncements(announcementsRes.data.slice(0, 3));
      setRecentResults(gradesRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['parent']}>
        <div className="p-4 md:p-8 lg:p-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid grid-cols-2 gap-4">
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
    <DashboardLayout allowedRoles={['parent']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="parent-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Parent Dashboard</h1>
          <p className="text-muted-foreground">Welcome! Stay updated with your children's progress.</p>
        </div>

        {/* Children Pills */}
        {stats?.children && stats.children.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Children</h3>
            <div className="flex flex-wrap gap-2">
              {stats.children.map((child) => (
                <Link 
                  key={child.id} 
                  to={`/parent/results?student=${child.id}`}
                  className="child-pill"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                    {child.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{child.full_name}</p>
                    <p className="text-xs text-muted-foreground">{child.class_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Children"
            value={stats?.total_children || 0}
            icon={Users}
            data-testid="stat-children"
          />
          <StatCard
            title="Results Available"
            value={stats?.results_available || 0}
            icon={ClipboardCheck}
            data-testid="stat-results"
          />
          <StatCard
            title="Unread Messages"
            value={stats?.unread_messages || 0}
            icon={MessageSquare}
            data-testid="stat-messages"
          />
          <StatCard
            title="Announcements"
            value={stats?.announcements || 0}
            icon={Megaphone}
            data-testid="stat-announcements"
          />
        </div>

        {/* Recent Results & Announcements */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Results */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Results</CardTitle>
              <Link to="/parent/results">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No results available yet</p>
              ) : (
                <div className="space-y-3">
                  {recentResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{result.subject_name}</p>
                        <p className="text-xs text-muted-foreground">{result.student_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">{result.total_score}/100</p>
                        <p className={`text-xs font-bold ${
                          result.grade === 'A' ? 'text-green-600' :
                          result.grade === 'B' ? 'text-blue-600' :
                          result.grade === 'C' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          Grade {result.grade}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Announcements</CardTitle>
              <Link to="/parent/announcements">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No announcements</p>
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
                        {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Link to="/parent/results">
              <Button variant="outline" className="w-full justify-between">
                View All Results
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/parent/messages">
              <Button variant="outline" className="w-full justify-between">
                Contact School
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/parent/announcements">
              <Button variant="outline" className="w-full justify-between">
                School News
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
