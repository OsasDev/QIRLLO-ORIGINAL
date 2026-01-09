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
import { subjectsApi, classesApi, usersApi } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, BookOpen, Pencil, Trash2, Loader2 } from 'lucide-react';

const COMMON_SUBJECTS = [
  { name: 'Mathematics', code: 'MTH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Yoruba', code: 'YOR' },
  { name: 'Igbo', code: 'IGB' },
  { name: 'Hausa', code: 'HAU' },
  { name: 'Civic Education', code: 'CIV' },
  { name: 'Basic Science', code: 'BSC' },
  { name: 'Social Studies', code: 'SOC' },
  { name: 'Computer Studies', code: 'ICT' },
  { name: 'Agricultural Science', code: 'AGR' },
  { name: 'Physical Health Education', code: 'PHE' },
  { name: 'Business Studies', code: 'BUS' },
  { name: 'Home Economics', code: 'HEC' },
  { name: 'Fine Arts', code: 'ART' },
  { name: 'Music', code: 'MUS' },
];

export const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');

  const [form, setForm] = useState({
    name: '',
    code: '',
    class_id: '',
    teacher_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subjectsRes, classesRes, teachersRes] = await Promise.all([
        subjectsApi.getAll(),
        classesApi.getAll(),
        usersApi.getTeachers(),
      ]);
      setSubjects(subjectsRes.data);
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
      if (editingSubject) {
        await subjectsApi.update(editingSubject.id, form);
        toast.success('Subject updated successfully');
      } else {
        await subjectsApi.create(form);
        toast.success('Subject created successfully');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      class_id: subject.class_id,
      teacher_id: subject.teacher_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;

    try {
      await subjectsApi.delete(id);
      toast.success('Subject deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete subject');
    }
  };

  const resetForm = () => {
    setEditingSubject(null);
    setForm({
      name: '',
      code: '',
      class_id: '',
      teacher_id: '',
    });
  };

  const handlePresetSelect = (preset) => {
    setForm({ ...form, name: preset.name, code: preset.code });
  };

  const filteredSubjects = filterClass === 'all' 
    ? subjects 
    : subjects.filter(s => s.class_id === filterClass);

  // Group subjects by class
  const subjectsByClass = filteredSubjects.reduce((acc, subject) => {
    const className = subject.class_name || 'Unassigned';
    if (!acc[className]) acc[className] = [];
    acc[className].push(subject);
    return acc;
  }, {});

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="subjects-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Subjects</h1>
            <p className="text-muted-foreground">Manage subjects and assign teachers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-subject-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Quick Select</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SUBJECTS.slice(0, 6).map((preset) => (
                      <Button
                        key={preset.code}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetSelect(preset)}
                        className="text-xs"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Subject Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      data-testid="subject-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      required
                      maxLength={4}
                      data-testid="subject-code-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={form.class_id} onValueChange={(value) => setForm({ ...form, class_id: value })}>
                    <SelectTrigger data-testid="subject-class-select">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject Teacher</Label>
                  <Select value={form.teacher_id} onValueChange={(value) => setForm({ ...form, teacher_id: value })}>
                    <SelectTrigger data-testid="subject-teacher-select">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No teacher assigned</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="save-subject-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingSubject ? 'Update Subject' : 'Create Subject'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-full sm:w-48" data-testid="filter-class-select">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subjects grouped by class */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : Object.keys(subjectsByClass).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No subjects found. Create your first subject.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(subjectsByClass).map(([className, classSubjects]) => (
              <div key={className}>
                <h3 className="font-semibold text-lg mb-4">{className}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {classSubjects.map((subject) => (
                    <Card key={subject.id} data-testid={`subject-card-${subject.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{subject.name}</h4>
                              <p className="text-xs text-muted-foreground font-mono">{subject.code}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {subject.teacher_name && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Teacher: {subject.teacher_name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
