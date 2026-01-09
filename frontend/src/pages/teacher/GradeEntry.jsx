import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../../components/ui/drawer';
import { subjectsApi, studentsApi, gradesApi, classesApi } from '../../lib/api';
import { toast } from 'sonner';
import { Save, Send, Loader2, ChevronRight } from 'lucide-react';

export const GradeEntry = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [existingGrades, setExistingGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '');
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '');
  const [selectedTerm, setSelectedTerm] = useState('first');
  
  const [grades, setGrades] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedClass) {
      loadStudentsAndGrades();
    }
  }, [selectedSubject, selectedClass, selectedTerm]);

  const loadInitialData = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        subjectsApi.getAll(),
        classesApi.getAll(),
      ]);
      setSubjects(subjectsRes.data);
      setClasses(classesRes.data);
      
      // Auto-select if params provided
      if (searchParams.get('subject')) {
        const subj = subjectsRes.data.find(s => s.id === searchParams.get('subject'));
        if (subj) {
          setSelectedSubject(subj.id);
          setSelectedClass(subj.class_id);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndGrades = async () => {
    setLoading(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        studentsApi.getAll({ class_id: selectedClass }),
        gradesApi.getAll({ subject_id: selectedSubject, term: selectedTerm }),
      ]);
      
      setStudents(studentsRes.data);
      
      // Map existing grades
      const gradesMap = {};
      const existingMap = {};
      gradesRes.data.forEach(g => {
        gradesMap[g.student_id] = {
          ca_score: g.ca_score,
          exam_score: g.exam_score,
          comment: g.comment || '',
        };
        existingMap[g.student_id] = g;
      });
      setGrades(gradesMap);
      setExistingGrades(existingMap);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, field, value) => {
    const numValue = parseFloat(value) || 0;
    const maxValue = field === 'ca_score' ? 40 : 60;
    const clampedValue = Math.min(Math.max(numValue, 0), maxValue);
    
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: clampedValue,
      }
    }));
  };

  const handleCommentChange = (studentId, comment) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comment,
      }
    }));
  };

  const calculateTotal = (studentId) => {
    const grade = grades[studentId];
    if (!grade) return 0;
    return (grade.ca_score || 0) + (grade.exam_score || 0);
  };

  const calculateGradeLetter = (total) => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 45) return 'D';
    if (total >= 40) return 'E';
    return 'F';
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const gradeEntries = Object.entries(grades)
        .filter(([_, g]) => g.ca_score !== undefined || g.exam_score !== undefined)
        .map(([studentId, g]) => ({
          student_id: studentId,
          ca_score: g.ca_score || 0,
          exam_score: g.exam_score || 0,
          comment: g.comment,
        }));
      
      if (gradeEntries.length === 0) {
        toast.error('No grades to save');
        return;
      }

      await gradesApi.createBulk({
        subject_id: selectedSubject,
        term: selectedTerm,
        academic_year: '2025/2026',
        grades: gradeEntries,
      });
      
      toast.success('Grades saved as draft');
      loadStudentsAndGrades();
    } catch (error) {
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // First save
      await handleSaveDraft();
      
      // Then submit
      await gradesApi.submitBulk(selectedSubject, selectedTerm);
      toast.success('Grades submitted for approval');
      loadStudentsAndGrades();
    } catch (error) {
      toast.error('Failed to submit grades');
    } finally {
      setSubmitting(false);
    }
  };

  const openMobileGradeEntry = (student) => {
    setSelectedStudent(student);
    setMobileDrawerOpen(true);
  };

  const saveMobileGrade = () => {
    setMobileDrawerOpen(false);
    setSelectedStudent(null);
  };

  const getGradeColor = (grade) => {
    if (grade === 'A') return 'text-green-600 bg-green-50';
    if (grade === 'B') return 'text-blue-600 bg-blue-50';
    if (grade === 'C') return 'text-yellow-600 bg-yellow-50';
    if (grade === 'D' || grade === 'E') return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <DashboardLayout allowedRoles={['teacher']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="grade-entry-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Grade Entry</h1>
          <p className="text-muted-foreground">Enter and manage student grades</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select value={selectedSubject} onValueChange={(value) => {
            setSelectedSubject(value);
            const subj = subjects.find(s => s.id === value);
            if (subj) setSelectedClass(subj.class_id);
          }}>
            <SelectTrigger data-testid="select-subject">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} - {subject.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger data-testid="select-term">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First Term</SelectItem>
              <SelectItem value="second">Second Term</SelectItem>
              <SelectItem value="third">Third Term</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft} 
              disabled={saving || !selectedSubject}
              className="flex-1"
              data-testid="save-draft-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !selectedSubject}
              className="flex-1"
              data-testid="submit-grades-btn"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit
            </Button>
          </div>
        </div>

        {/* Grade Entry Interface */}
        {!selectedSubject ? (
          <div className="text-center py-12 text-muted-foreground">
            Select a subject to begin entering grades
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No students found in this class
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-4 font-semibold text-sm">Student Name</th>
                    <th className="text-center p-4 font-semibold text-sm w-24">CA (40)</th>
                    <th className="text-center p-4 font-semibold text-sm w-24">Exam (60)</th>
                    <th className="text-center p-4 font-semibold text-sm w-20">Total</th>
                    <th className="text-center p-4 font-semibold text-sm w-20">Grade</th>
                    <th className="text-left p-4 font-semibold text-sm">Comment</th>
                    <th className="text-center p-4 font-semibold text-sm w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const total = calculateTotal(student.id);
                    const gradeLetter = calculateGradeLetter(total);
                    const existing = existingGrades[student.id];
                    
                    return (
                      <tr 
                        key={student.id} 
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}
                        data-testid={`grade-row-${student.id}`}
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{student.admission_number}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Input
                            type="number"
                            min="0"
                            max="40"
                            value={grades[student.id]?.ca_score ?? ''}
                            onChange={(e) => handleGradeChange(student.id, 'ca_score', e.target.value)}
                            className="w-16 text-center font-mono mx-auto"
                            data-testid={`ca-input-${student.id}`}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Input
                            type="number"
                            min="0"
                            max="60"
                            value={grades[student.id]?.exam_score ?? ''}
                            onChange={(e) => handleGradeChange(student.id, 'exam_score', e.target.value)}
                            className="w-16 text-center font-mono mx-auto"
                            data-testid={`exam-input-${student.id}`}
                          />
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{total || '-'}</td>
                        <td className="p-4 text-center">
                          {total > 0 && (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${getGradeColor(gradeLetter)}`}>
                              {gradeLetter}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Input
                            placeholder="Add comment..."
                            value={grades[student.id]?.comment ?? ''}
                            onChange={(e) => handleCommentChange(student.id, e.target.value)}
                            className="text-sm"
                          />
                        </td>
                        <td className="p-4 text-center">
                          {existing && (
                            <span className={`badge-${existing.status}`}>{existing.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {students.map((student) => {
                const total = calculateTotal(student.id);
                const gradeLetter = calculateGradeLetter(total);
                const existing = existingGrades[student.id];
                
                return (
                  <div
                    key={student.id}
                    onClick={() => openMobileGradeEntry(student)}
                    className="student-grade-card cursor-pointer"
                    data-testid={`mobile-grade-card-${student.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{student.full_name}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{student.admission_number}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {total > 0 && (
                          <div className="text-right">
                            <p className="font-mono font-bold">{total}</p>
                            <span className={`text-xs font-bold ${getGradeColor(gradeLetter).split(' ')[0]}`}>
                              Grade {gradeLetter}
                            </span>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    {existing && (
                      <div className="mt-2">
                        <span className={`badge-${existing.status}`}>{existing.status}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer for Grade Entry */}
            <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{selectedStudent?.full_name}</DrawerTitle>
                </DrawerHeader>
                {selectedStudent && (
                  <div className="px-4 pb-8 space-y-6">
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedStudent.admission_number}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">CA Score (Max 40)</label>
                        <Input
                          type="number"
                          min="0"
                          max="40"
                          value={grades[selectedStudent.id]?.ca_score ?? ''}
                          onChange={(e) => handleGradeChange(selectedStudent.id, 'ca_score', e.target.value)}
                          className="text-lg font-mono text-center"
                          data-testid="mobile-ca-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Exam Score (Max 60)</label>
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          value={grades[selectedStudent.id]?.exam_score ?? ''}
                          onChange={(e) => handleGradeChange(selectedStudent.id, 'exam_score', e.target.value)}
                          className="text-lg font-mono text-center"
                          data-testid="mobile-exam-input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-8 py-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-3xl font-bold font-mono">{calculateTotal(selectedStudent.id)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Grade</p>
                        <p className={`text-3xl font-bold ${getGradeColor(calculateGradeLetter(calculateTotal(selectedStudent.id))).split(' ')[0]}`}>
                          {calculateGradeLetter(calculateTotal(selectedStudent.id))}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Comment</label>
                      <Textarea
                        placeholder="Add a comment for this student..."
                        value={grades[selectedStudent.id]?.comment ?? ''}
                        onChange={(e) => handleCommentChange(selectedStudent.id, e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button className="w-full" onClick={saveMobileGrade} data-testid="mobile-save-grade">
                      Done
                    </Button>
                  </div>
                )}
              </DrawerContent>
            </Drawer>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
