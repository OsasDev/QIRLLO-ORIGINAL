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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { gradesApi, classesApi, subjectsApi } from '../../lib/api';
import { toast } from 'sonner';
import { Check, CheckCheck, Loader2 } from 'lucide-react';

export const ResultsApproval = () => {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('first');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        classesApi.getAll(),
        subjectsApi.getAll(),
      ]);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      await loadGrades();
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    try {
      const params = { term: filterTerm };
      if (filterClass !== 'all') params.class_id = filterClass;
      
      const res = await gradesApi.getAll(params);
      setGrades(res.data);
    } catch (error) {
      toast.error('Failed to load grades');
    }
  };

  useEffect(() => {
    if (!loading) loadGrades();
  }, [filterClass, filterTerm]);

  const handleApprove = async (gradeId) => {
    setApproving(true);
    try {
      await gradesApi.approve(gradeId);
      toast.success('Grade approved');
      loadGrades();
    } catch (error) {
      toast.error('Failed to approve grade');
    } finally {
      setApproving(false);
    }
  };

  const handleBulkApprove = async () => {
    setApproving(true);
    try {
      const params = { term: filterTerm };
      if (filterClass !== 'all') params.class_id = filterClass;
      
      await gradesApi.approveBulk(params);
      toast.success('All pending grades approved');
      loadGrades();
    } catch (error) {
      toast.error('Failed to approve grades');
    } finally {
      setApproving(false);
    }
  };

  const pendingGrades = grades.filter(g => g.status === 'submitted');
  const approvedGrades = grades.filter(g => g.status === 'approved');
  const draftGrades = grades.filter(g => g.status === 'draft');

  const displayGrades = activeTab === 'pending' ? pendingGrades 
    : activeTab === 'approved' ? approvedGrades 
    : draftGrades;

  const getGradeColor = (grade) => {
    if (grade === 'A') return 'text-green-600';
    if (grade === 'B') return 'text-blue-600';
    if (grade === 'C') return 'text-yellow-600';
    if (grade === 'D' || grade === 'E') return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="results-approval-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Results Approval</h1>
            <p className="text-muted-foreground">Review and approve submitted grades</p>
          </div>
          {pendingGrades.length > 0 && (
            <Button onClick={handleBulkApprove} disabled={approving} data-testid="bulk-approve-btn">
              {approving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2" />}
              Approve All ({pendingGrades.length})
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-full sm:w-48" data-testid="filter-term-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First Term</SelectItem>
              <SelectItem value="second">Second Term</SelectItem>
              <SelectItem value="third">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingGrades.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedGrades.length})
            </TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">
              Draft ({draftGrades.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">CA (40)</TableHead>
                    <TableHead className="text-center">Exam (60)</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Status</TableHead>
                    {activeTab === 'pending' && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayGrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeTab === 'pending' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        No {activeTab} grades found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayGrades.map((grade) => (
                      <TableRow key={grade.id} data-testid={`grade-row-${grade.id}`}>
                        <TableCell className="font-medium">{grade.student_name}</TableCell>
                        <TableCell>{grade.subject_name}</TableCell>
                        <TableCell className="text-center font-mono">{grade.ca_score}</TableCell>
                        <TableCell className="text-center font-mono">{grade.exam_score}</TableCell>
                        <TableCell className="text-center font-mono font-bold">{grade.total_score}</TableCell>
                        <TableCell className={`text-center font-bold ${getGradeColor(grade.grade)}`}>
                          {grade.grade}
                        </TableCell>
                        <TableCell>
                          <span className={`badge-${grade.status}`}>{grade.status}</span>
                        </TableCell>
                        {activeTab === 'pending' && (
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(grade.id)}
                              disabled={approving}
                              data-testid={`approve-${grade.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {displayGrades.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No {activeTab} grades found</p>
              ) : (
                displayGrades.map((grade) => (
                  <div key={grade.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{grade.student_name}</h3>
                        <p className="text-sm text-muted-foreground">{grade.subject_name}</p>
                      </div>
                      <span className={`badge-${grade.status}`}>{grade.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">CA</p>
                        <p className="font-mono font-medium">{grade.ca_score}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Exam</p>
                        <p className="font-mono font-medium">{grade.exam_score}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-mono font-bold">{grade.total_score}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Grade</p>
                        <p className={`font-bold ${getGradeColor(grade.grade)}`}>{grade.grade}</p>
                      </div>
                    </div>
                    {activeTab === 'pending' && (
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => handleApprove(grade.id)}
                        disabled={approving}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}
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
