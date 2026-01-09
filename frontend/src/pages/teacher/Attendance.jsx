import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { attendanceApi, classesApi, studentsApi } from '../../lib/api';
import { toast } from 'sonner';
import { CalendarIcon, Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: Check, color: 'text-green-600 bg-green-50' },
  { value: 'absent', label: 'Absent', icon: X, color: 'text-red-600 bg-red-50' },
  { value: 'late', label: 'Late', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'text-blue-600 bg-blue-50' },
];

export const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadStudentsAndAttendance();
    }
  }, [selectedClass, selectedDate]);

  const loadClasses = async () => {
    try {
      const res = await classesApi.getAll();
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClass(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [studentsRes, attendanceRes] = await Promise.all([
        studentsApi.getAll({ class_id: selectedClass }),
        attendanceApi.getAll({ class_id: selectedClass, date: dateStr }),
      ]);
      
      setStudents(studentsRes.data);
      
      // Map existing attendance
      const existingMap = {};
      const attendanceMap = {};
      attendanceRes.data.forEach(a => {
        existingMap[a.student_id] = a;
        attendanceMap[a.student_id] = a.status;
      });
      setExistingAttendance(existingMap);
      setAttendance(attendanceMap);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status) => {
    const newAttendance = {};
    students.forEach(s => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        status,
      }));

      await attendanceApi.markBulk({
        class_id: selectedClass,
        date: format(selectedDate, 'yyyy-MM-dd'),
        records,
      });

      toast.success('Attendance saved successfully');
      loadStudentsAndAttendance();
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.icon : Check;
  };

  const getStatusColor = (status) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? option.color : '';
  };

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;

  return (
    <DashboardLayout allowedRoles={['admin', 'teacher']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="attendance-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Mark and manage student attendance</p>
          </div>
          <Button onClick={handleSave} disabled={saving || Object.keys(attendance).length === 0} data-testid="save-attendance-btn">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save Attendance
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-class">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-48 justify-start" data-testid="select-date">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')}>
              All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')}>
              All Absent
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{students.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
            <p className="text-xs text-yellow-600">Late</p>
          </div>
        </div>

        {/* Attendance List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No students in this class
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student) => {
              const currentStatus = attendance[student.id];
              const StatusIcon = getStatusIcon(currentStatus);
              
              return (
                <div
                  key={student.id}
                  className="bg-white border rounded-lg p-4 flex items-center justify-between"
                  data-testid={`attendance-row-${student.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      currentStatus ? getStatusColor(currentStatus) : 'bg-muted'
                    )}>
                      {currentStatus ? <StatusIcon className="w-5 h-5" /> : <span className="text-muted-foreground">?</span>}
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.admission_number}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={currentStatus === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, option.value)}
                        className={cn(
                          'min-w-[80px]',
                          currentStatus === option.value && option.value === 'present' && 'bg-green-600 hover:bg-green-700',
                          currentStatus === option.value && option.value === 'absent' && 'bg-red-600 hover:bg-red-700',
                          currentStatus === option.value && option.value === 'late' && 'bg-yellow-600 hover:bg-yellow-700',
                          currentStatus === option.value && option.value === 'excused' && 'bg-blue-600 hover:bg-blue-700'
                        )}
                        data-testid={`${option.value}-btn-${student.id}`}
                      >
                        <option.icon className="w-4 h-4 mr-1" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
