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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { feesApi, classesApi, studentsApi } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Wallet, Receipt, Search, Loader2, Download } from 'lucide-react';

export const Fees = () => {
  const [balances, setBalances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('first');

  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    payment_method: 'cash',
    term: 'first',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadBalances();
    }
  }, [filterClass, selectedTerm]);

  const loadData = async () => {
    try {
      const [classesRes, studentsRes, paymentsRes] = await Promise.all([
        classesApi.getAll(),
        studentsApi.getAll(),
        feesApi.getPayments(),
      ]);
      setClasses(classesRes.data);
      setStudents(studentsRes.data);
      setPayments(paymentsRes.data);
      await loadBalances();
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    try {
      const params = { term: selectedTerm };
      if (filterClass !== 'all') params.class_id = filterClass;
      
      const res = await feesApi.getAllBalances(params);
      setBalances(res.data);
    } catch (error) {
      toast.error('Failed to load fee balances');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await feesApi.recordPayment({
        ...form,
        amount: parseFloat(form.amount),
        academic_year: '2025/2026',
      });
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      setForm({ student_id: '', amount: '', payment_method: 'cash', term: 'first', notes: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const filteredBalances = balances.filter(b => {
    const matchesSearch = b.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = balances.reduce((sum, b) => sum + b.total_paid, 0);
  const totalOutstanding = balances.reduce((sum, b) => sum + b.balance, 0);
  const paidCount = balances.filter(b => b.status === 'paid').length;

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="fees-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">School Fees</h1>
            <p className="text-muted-foreground">Manage fee collection and balances</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="record-payment-btn">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Fee Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={form.student_id} onValueChange={(value) => setForm({ ...form, student_id: value })}>
                    <SelectTrigger data-testid="payment-student-select">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} - {student.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    placeholder="50000"
                    data-testid="payment-amount-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={form.payment_method} onValueChange={(value) => setForm({ ...form, payment_method: value })}>
                      <SelectTrigger data-testid="payment-method-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Term</Label>
                    <Select value={form.term} onValueChange={(value) => setForm({ ...form, term: value })}>
                      <SelectTrigger data-testid="payment-term-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">First Term</SelectItem>
                        <SelectItem value="second">Second Term</SelectItem>
                        <SelectItem value="third">Third Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Payment notes..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="save-payment-btn">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                  Record Payment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-xl font-bold text-green-600">₦{totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Fully Paid</p>
            <p className="text-xl font-bold">{paidCount}/{balances.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="text-xl font-bold">{balances.length > 0 ? Math.round(paidCount / balances.length * 100) : 0}%</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="balances" className="mb-6">
          <TabsList>
            <TabsTrigger value="balances" data-testid="tab-balances">Fee Balances</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="balances" className="mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-fees-input"
                />
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Term</SelectItem>
                  <SelectItem value="second">Second Term</SelectItem>
                  <SelectItem value="third">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Balances Table */}
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Total Fees</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBalances.map((balance) => (
                        <TableRow key={balance.student_id} data-testid={`balance-row-${balance.student_id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{balance.student_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{balance.admission_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{balance.class_name}</TableCell>
                          <TableCell className="text-right font-mono">₦{balance.total_fees.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">₦{balance.total_paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-600">
                            ₦{balance.balance.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              balance.status === 'paid' ? 'bg-green-100 text-green-800' :
                              balance.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {balance.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.receipt_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.student_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.class_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-green-600">₦{payment.amount.toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell className="capitalize">{payment.term} Term</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
