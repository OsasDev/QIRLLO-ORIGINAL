import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { gradesApi, studentsApi, schoolApi } from '../../lib/api';
import { toast } from 'sonner';
import { Printer, Download } from 'lucide-react';

export const ParentResults = () => {
  const [searchParams] = useSearchParams();
  const [children, setChildren] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(searchParams.get('student') || '');
  const [selectedTerm, setSelectedTerm] = useState('first');
  const [schoolSettings, setSchoolSettings] = useState({ school_name: 'Loading...', school_logo: null, motto: '' });

  useEffect(() => {
    loadChildren();
    loadSchoolSettings();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadGrades();
    }
  }, [selectedChild, selectedTerm]);

  const loadChildren = async () => {
    try {
      const res = await studentsApi.getAll();
      setChildren(res.data);
      if (res.data.length > 0 && !selectedChild) {
        setSelectedChild(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolSettings = async () => {
    try {
      const res = await schoolApi.getSettings();
      setSchoolSettings(res.data);
    } catch (error) {
      // silently fail, keep defaults
    }
  };

  const loadGrades = async () => {
    setLoading(true);
    try {
      const res = await gradesApi.getAll({ student_id: selectedChild, term: selectedTerm });
      setGrades(res.data);
    } catch (error) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade === 'A') return 'text-green-600';
    if (grade === 'B') return 'text-blue-600';
    if (grade === 'C') return 'text-yellow-600';
    if (grade === 'D' || grade === 'E') return 'text-orange-600';
    return 'text-red-600';
  };

  const selectedChildData = children.find(c => c.id === selectedChild);

  const totalScore = grades.reduce((sum, g) => sum + g.total_score, 0);
  const averageScore = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : 0;
  const passedSubjects = grades.filter(g => g.total_score >= 40).length;

  return (
    <DashboardLayout allowedRoles={['parent']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="parent-results-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Academic Results</h1>
            <p className="text-muted-foreground">View your children's academic performance</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()} data-testid="print-results-btn">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 no-print">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-full sm:w-64" data-testid="select-child">
              <SelectValue placeholder="Select Child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.full_name} - {child.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-term">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First Term</SelectItem>
              <SelectItem value="second">Second Term</SelectItem>
              <SelectItem value="third">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!selectedChild ? (
          <div className="text-center py-12 text-muted-foreground">
            Select a child to view results
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Result Card (Paper style) */}
            <div className="result-paper p-6 md:p-8 mb-6">
              {/* School Header */}
              <div className="text-center mb-6 pb-6 border-b">
                <div className="w-16 h-16 rounded-xl bg-primary mx-auto flex items-center justify-center mb-4 overflow-hidden">
                  {schoolSettings.school_logo ? (
                    <img src={schoolSettings.school_logo} alt={schoolSettings.school_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-3xl">
                      {(schoolSettings.school_name || 'Q').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold">{(schoolSettings.school_name || 'QIRLLO School').toUpperCase()}</h2>
                <p className="text-muted-foreground">Academic Report Card</p>
                {schoolSettings.motto && (
                  <p className="text-xs text-muted-foreground italic mt-1">{schoolSettings.motto}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Powered by QIRLLO</p>
              </div>

              {/* Student Info */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-semibold">{selectedChildData?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-semibold">{selectedChildData?.class_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission No.</p>
                  <p className="font-mono">{selectedChildData?.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className="font-semibold capitalize">{selectedTerm} Term 2025/2026</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{averageScore}%</p>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{grades.length}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{passedSubjects}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
              </div>

              {/* Results Table */}
              {grades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No results available for this term
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-semibold">Subject</th>
                        <th className="text-center py-3 px-2 font-semibold">CA (40)</th>
                        <th className="text-center py-3 px-2 font-semibold">Exam (60)</th>
                        <th className="text-center py-3 px-2 font-semibold">Total</th>
                        <th className="text-center py-3 px-2 font-semibold">Grade</th>
                        <th className="text-left py-3 px-2 font-semibold">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((grade) => (
                        <tr key={grade.id} className="border-b" data-testid={`result-row-${grade.id}`}>
                          <td className="py-3 px-2 font-medium">{grade.subject_name}</td>
                          <td className="text-center py-3 px-2 font-mono">{grade.ca_score}</td>
                          <td className="text-center py-3 px-2 font-mono">{grade.exam_score}</td>
                          <td className="text-center py-3 px-2 font-mono font-bold">{grade.total_score}</td>
                          <td className={`text-center py-3 px-2 font-bold ${getGradeColor(grade.grade)}`}>
                            {grade.grade}
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {grade.comment || (grade.total_score >= 70 ? 'Excellent' :
                              grade.total_score >= 60 ? 'Very Good' :
                                grade.total_score >= 50 ? 'Good' :
                                  grade.total_score >= 40 ? 'Fair' : 'Needs Improvement')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                <p>Generated by QIRLLO School Management System</p>
                <p className="mt-1">This is an official academic document</p>
              </div>
            </div>

            {/* Grading Scale */}
            <Card className="no-print">
              <CardHeader>
                <CardTitle className="text-sm">Grading Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><strong className="text-green-600">A</strong>: 70-100 (Excellent)</span>
                  <span><strong className="text-blue-600">B</strong>: 60-69 (Very Good)</span>
                  <span><strong className="text-yellow-600">C</strong>: 50-59 (Good)</span>
                  <span><strong className="text-orange-600">D</strong>: 45-49 (Fair)</span>
                  <span><strong className="text-orange-600">E</strong>: 40-44 (Pass)</span>
                  <span><strong className="text-red-600">F</strong>: 0-39 (Fail)</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
