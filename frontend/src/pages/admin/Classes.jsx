import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { classesApi, usersApi } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Users, Pencil, Trash2, Loader2 } from 'lucide-react';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

export const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    level: 'JSS1',
    section: 'A',
    teacher_id: '',
    academic_year: '2025/2026',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesRes, teachersRes] = await Promise.all([
        classesApi.getAll(),
        usersApi.getTeachers(),
      ]);
      setClasses(classesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = { ...form, name: `${form.level} ${form.section}` };
      if (editingClass) {
        await classesApi.update(editingClass.id, data);
        toast.success('Class updated successfully');
      } else {
        await classesApi.create(data);
        toast.success('Class created successfully');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      level: cls.level,
      section: cls.section || 'A',
      teacher_id: cls.teacher_id || '',
      academic_year: cls.academic_year,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;

    try {
      await classesApi.delete(id);
      toast.success('Class deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete class');
    }
  };

  const resetForm = () => {
    setEditingClass(null);
    setForm({
      name: '',
      level: 'JSS1',
      section: 'A',
      teacher_id: '',
      academic_year: '2025/2026',
    });
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="classes-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Classes</h1>
            <p className="text-muted-foreground">Manage class sections and teacher assignments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-class-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={form.level} onValueChange={(value) => setForm({ ...form, level: value })}>
                      <SelectTrigger data-testid="class-level-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
                      placeholder="A"
                      maxLength={2}
                      data-testid="class-section-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Class Teacher</Label>
                  <Select
                    value={form.teacher_id || '_none'}
                    onValueChange={(value) => setForm({ ...form, teacher_id: value === '_none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="class-teacher-select">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No teacher assigned</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    placeholder="2025/2026"
                    data-testid="class-year-input"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="save-class-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No classes found. Create your first class.
              </div>
            ) : (
              classes.map((cls) => (
                <Card key={cls.id} data-testid={`class-card-${cls.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl">{cls.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cls)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{cls.student_count} students</span>
                      </div>
                    </div>
                    {cls.teacher_name ? (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Class Teacher:</span>{' '}
                        <span className="font-medium">{cls.teacher_name}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No teacher assigned</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{cls.academic_year}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
