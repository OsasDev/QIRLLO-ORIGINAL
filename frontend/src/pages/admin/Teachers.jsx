import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { usersApi } from '../../lib/api';
import { toast } from 'sonner';
import { GraduationCap, Mail, Phone } from 'lucide-react';

export const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const res = await usersApi.getTeachers();
      setTeachers(res.data);
    } catch (error) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="teachers-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">View and manage teaching staff</p>
        </div>

        {/* Teachers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No teachers registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((teacher) => (
              <Card key={teacher.id} data-testid={`teacher-card-${teacher.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{teacher.full_name}</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{teacher.email}</span>
                        </p>
                        {teacher.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{teacher.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>
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
