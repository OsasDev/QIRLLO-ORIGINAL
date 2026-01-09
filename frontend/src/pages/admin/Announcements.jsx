import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { announcementsApi } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Megaphone, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal',
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await announcementsApi.create(form);
      toast.success('Announcement posted successfully');
      setDialogOpen(false);
      setForm({ title: '', content: '', target_audience: 'all', priority: 'normal' });
      loadAnnouncements();
    } catch (error) {
      toast.error('Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementsApi.delete(id);
      toast.success('Announcement deleted');
      loadAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const getAudienceLabel = (audience) => {
    const labels = {
      all: 'Everyone',
      teachers: 'Teachers Only',
      parents: 'Parents Only',
      students: 'Students Only',
    };
    return labels[audience] || audience;
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="announcements-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Broadcast messages to the school community</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-announcement-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Announcement title"
                    data-testid="announcement-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={5}
                    placeholder="Write your announcement here..."
                    data-testid="announcement-content-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={form.target_audience} onValueChange={(value) => setForm({ ...form, target_audience: value })}>
                      <SelectTrigger data-testid="announcement-audience-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="teachers">Teachers Only</SelectItem>
                        <SelectItem value="parents">Parents Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                      <SelectTrigger data-testid="announcement-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="post-announcement-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
                  Post Announcement
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No announcements yet. Create your first announcement.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white border rounded-lg p-6 ${announcement.priority === 'high' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-primary'}`}
                data-testid={`announcement-${announcement.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      {announcement.priority === 'high' && (
                        <span className="bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5 rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>By {announcement.author_name}</span>
                      <span>•</span>
                      <span>{format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        {getAudienceLabel(announcement.target_audience)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(announcement.id)}
                    data-testid={`delete-announcement-${announcement.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
