import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { announcementsApi } from '../../lib/api';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { format } from 'date-fns';

export const ParentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await announcementsApi.getAll();
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['parent']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="parent-announcements-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Stay updated with school news and events</p>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No announcements available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white border rounded-lg p-6 ${announcement.priority === 'high' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-primary'}`}
                data-testid={`announcement-${announcement.id}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {announcement.priority === 'high' && (
                    <span className="bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5 rounded">
                      Important
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{announcement.content}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>By {announcement.author_name}</span>
                  <span>•</span>
                  <span>{format(new Date(announcement.created_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
