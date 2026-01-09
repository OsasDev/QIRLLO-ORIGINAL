import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { classesApi, studentsApi } from '../../lib/api';
import { toast } from 'sonner';
import { Users, ClipboardCheck, ChevronRight } from 'lucide-react';

export const TeacherClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await classesApi.getAll();
      setClasses(res.data);
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['teacher']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="teacher-classes-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-muted-foreground">View and manage your assigned classes</p>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No classes assigned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow" data-testid={`class-card-${cls.id}`}>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">{cls.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Users className="w-4 h-4" />
                    <span>{cls.student_count} students</span>
                  </div>
                  <div className="space-y-2">
                    <Link to={`/teacher/grades?class=${cls.id}`}>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4" />
                          Enter Grades
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
