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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { attendanceApi, classesApi } from '../../lib/api';
import { toast } from 'sonner';
import { CalendarIcon, Users, Check, X, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const AdminAttendanceSummary = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [selectedClass, selectedDate]);

  const loadClasses = async () => {
    try {
      const res = await classesApi.getAll();
      setClasses(res.data);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = { date: format(selectedDate, 'yyyy-MM-dd') };
      if (selectedClass !== 'all') params.class_id = selectedClass;
      
      const res = await attendanceApi.getAll(params);
      setAttendance(res.data);
    } catch (error) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const excusedCount = attendance.filter(a => a.status === 'excused').length;

  // Group by class
  const byClass = attendance.reduce((acc, a) => {
    const className = a.class_name || 'Unknown';
    if (!acc[className]) {
      acc[className] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }
    acc[className][a.status]++;
    acc[className].total++;
    return acc;
  }, {});

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="admin-attendance-summary">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Attendance Summary</h1>
          <p className="text-muted-foreground">View school-wide attendance for the day</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48" data-testid="filter-class">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{attendance.length}</p>
              <p className="text-sm text-muted-foreground">Total Marked</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Check className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-green-600">Present</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <X className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-3xl font-bold text-red-600">{absentCount}</p>
              <p className="text-sm text-red-600">Absent</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-3xl font-bold text-yellow-600">{lateCount}</p>
              <p className="text-sm text-yellow-600">Late</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">{excusedCount}</p>
              <p className="text-sm text-blue-600">Excused</p>
            </CardContent>
          </Card>
        </div>

        {/* By Class Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            ) : Object.keys(byClass).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No attendance marked for this date
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byClass).map(([className, stats]) => (
                  <div key={className} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{className}</h4>
                      <p className="text-sm text-muted-foreground">{stats.total} students marked</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" /> {stats.present}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <X className="w-4 h-4" /> {stats.absent}
                      </span>
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Clock className="w-4 h-4" /> {stats.late}
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <AlertCircle className="w-4 h-4" /> {stats.excused}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absent Students List */}
        {absentCount > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Absent Students ({absentCount})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attendance.filter(a => a.status === 'absent').map((record) => (
                  <div key={record.id} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-sm">{record.student_name}</p>
                    <p className="text-xs text-muted-foreground">{record.class_name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
