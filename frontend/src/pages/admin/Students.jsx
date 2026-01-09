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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { studentsApi, classesApi, usersApi } from '../../lib/api';
import { BulkUploadModal } from '../../components/BulkUploadModal';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Loader2, Upload } from 'lucide-react';

export const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    admission_number: '',
    class_id: '',
    gender: 'male',
    date_of_birth: '',
    parent_id: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsRes, classesRes, parentsRes] = await Promise.all([
        studentsApi.getAll(),
        classesApi.getAll(),
        usersApi.getParents(),
      ]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
      setParents(parentsRes.data);
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
      if (editingStudent) {
        await studentsApi.update(editingStudent.id, form);
        toast.success('Student updated successfully');
      } else {
        await studentsApi.create(form);
        toast.success('Student added successfully');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setForm({
      full_name: student.full_name,
      admission_number: student.admission_number,
      class_id: student.class_id,
      gender: student.gender,
      date_of_birth: student.date_of_birth || '',
      parent_id: student.parent_id || '',
      address: student.address || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      await studentsApi.delete(id);
      toast.success('Student deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const resetForm = () => {
    setEditingStudent(null);
    setForm({
      full_name: '',
      admission_number: '',
      class_id: '',
      gender: 'male',
      date_of_birth: '',
      parent_id: '',
      address: '',
    });
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'all' || student.class_id === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="students-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">Manage student enrollment and records</p>
          </div>
          <div className="flex gap-2">
            {/* Bulk Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="bulk-upload-btn">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Students</DialogTitle>
                </DialogHeader>
                <BulkUploadModal type="students" onSuccess={() => { setUploadDialogOpen(false); loadData(); }} />
              </DialogContent>
            </Dialog>

            {/* Add Student Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-student-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                      data-testid="student-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admission_number">Admission Number</Label>
                    <Input
                      id="admission_number"
                      value={form.admission_number}
                      onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
                    required
                    placeholder="QRL/2025/0001"
                    data-testid="student-admission-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={form.class_id} onValueChange={(value) => setForm({ ...form, class_id: value })}>
                      <SelectTrigger data-testid="student-class-select">
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
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(value) => setForm({ ...form, gender: value })}>
                      <SelectTrigger data-testid="student-gender-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Parent/Guardian</Label>
                  <Select value={form.parent_id} onValueChange={(value) => setForm({ ...form, parent_id: value })}>
                    <SelectTrigger data-testid="student-parent-select">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>{parent.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="save-student-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </Button>
              </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-students-input"
            />
          </div>
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

        {/* Table */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} data-testid={`student-row-${student.id}`}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell className="font-mono text-sm">{student.admission_number}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell className="capitalize">{student.gender}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(student)} data-testid={`edit-student-${student.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} data-testid={`delete-student-${student.id}`}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredStudents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No students found</p>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{student.full_name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{student.admission_number}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="bg-muted px-2 py-1 rounded">{student.class_name}</span>
                      <span className="capitalize text-muted-foreground">{student.gender}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
