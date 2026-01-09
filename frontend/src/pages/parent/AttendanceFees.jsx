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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { attendanceApi, studentsApi, feesApi } from '../../lib/api';
import { toast } from 'sonner';
import { Calendar, Wallet, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const ParentAttendanceFees = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [feeBalance, setFeeBalance] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildData();
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      const res = await studentsApi.getAll();
      setChildren(res.data);
      if (res.data.length > 0) {
        setSelectedChild(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadChildData = async () => {
    setLoading(true);
    try {
      const [summaryRes, feeRes, attendanceRes] = await Promise.all([
        attendanceApi.getSummary(selectedChild, 'first'),
        feesApi.getBalance(selectedChild, 'first'),
        attendanceApi.getAll({ student_id: selectedChild }),
      ]);
      setAttendanceSummary(summaryRes.data);
      setFeeBalance(feeRes.data);
      setRecentAttendance(attendanceRes.data.slice(0, 10));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Calendar className="w-4 h-4 text-blue-600" />;
    }
  };

  const selectedChildData = children.find(c => c.id === selectedChild);

  return (
    <DashboardLayout allowedRoles={['parent']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="parent-attendance-fees-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Attendance & Fees</h1>
          <p className="text-muted-foreground">Track your child's attendance and fee status</p>
        </div>

        {/* Child Selector */}
        <div className="mb-6">
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
        </div>

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded-lg"></div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Attendance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Attendance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceSummary ? (
                  <div className="space-y-6">
                    {/* Attendance Rate */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Attendance Rate</span>
                        <span className="text-lg font-bold">{attendanceSummary.attendance_rate}%</span>
                      </div>
                      <Progress value={attendanceSummary.attendance_rate} className="h-3" />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{attendanceSummary.present}</p>
                        <p className="text-xs text-green-600">Days Present</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{attendanceSummary.absent}</p>
                        <p className="text-xs text-red-600">Days Absent</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{attendanceSummary.late}</p>
                        <p className="text-xs text-yellow-600">Days Late</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{attendanceSummary.total_days}</p>
                        <p className="text-xs text-blue-600">Total Days</p>
                      </div>
                    </div>

                    {/* Recent Attendance */}
                    <div>
                      <h4 className="font-medium mb-3">Recent Attendance</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {recentAttendance.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
                        ) : (
                          recentAttendance.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(record.status)}
                                <span className="text-sm">{format(new Date(record.date), 'EEE, MMM d')}</span>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {record.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No attendance data available</p>
                )}
              </CardContent>
            </Card>

            {/* Fee Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Fee Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feeBalance ? (
                  <div className="space-y-6">
                    {/* Balance Summary */}
                    <div className={`p-6 rounded-lg text-center ${
                      feeBalance.balance <= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-muted-foreground mb-1">Outstanding Balance</p>
                      <p className={`text-3xl font-bold ${
                        feeBalance.balance <= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₦{Math.max(0, feeBalance.balance).toLocaleString()}
                      </p>
                      {feeBalance.balance <= 0 && (
                        <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Fully Paid
                        </p>
                      )}
                    </div>

                    {/* Fee Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Total Fees</span>
                        <span className="font-mono font-medium">₦{feeBalance.total_fees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-green-50 rounded">
                        <span className="text-sm text-green-700">Amount Paid</span>
                        <span className="font-mono font-medium text-green-700">₦{feeBalance.total_paid.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment History */}
                    <div>
                      <h4 className="font-medium mb-3">Payment History</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {feeBalance.payments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No payments yet</p>
                        ) : (
                          feeBalance.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div>
                                <p className="text-sm font-mono">{payment.receipt_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(payment.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <span className="font-mono font-medium text-green-600">
                                ₦{payment.amount.toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No fee data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
