import { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { debtAPI } from '../../../shared/api/api';

interface UnpaidMonth {
  year: number;
  month: number;
  label: string;
}

interface AnalysisResult {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  unpaid_months: UnpaidMonth[];
  unpaid_months_count: number;
  total_payments: number;
  total_debt_balance: number;
}

interface AnalysisResponse {
  analysis_period: {
    start: string;
    end: string;
    months_analyzed: number;
  };
  summary: {
    total_students_analyzed: number;
    students_with_unpaid_months: number;
    total_unpaid_instances: number;
  };
  results: AnalysisResult[];
}

const DebtAnalyzer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [monthlyFee, setMonthlyFee] = useState<string>('100');
  const [generating, setGenerating] = useState(false);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await debtAPI.analyzeUnpaidMonths();
      setAnalysis(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to analyze payments');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDebts = async () => {
    if (selectedStudents.length === 0 || !monthlyFee) return;

    try {
      setGenerating(true);
      await debtAPI.generateFromAnalysis({
        student_ids: selectedStudents,
        monthly_fee: parseFloat(monthlyFee),
      });
      setGenerateDialogOpen(false);
      setSelectedStudents([]);
      // Re-analyze to show updated data
      handleAnalyze();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to generate debts');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (analysis) {
      setSelectedStudents(analysis.results.map((r) => r.student_id));
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Payment Analysis</h3>
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : 'Analyze Unpaid Months'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex justify-between items-center">
              {error}
              <button onClick={() => setError(null)} className="text-sm underline ml-2">
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {analysis && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {analysis.summary.total_students_analyzed}
                </p>
                <p className="text-sm text-muted-foreground">Students Analyzed</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {analysis.summary.students_with_unpaid_months}
                </p>
                <p className="text-sm text-muted-foreground">With Unpaid Months</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {analysis.summary.total_unpaid_instances}
                </p>
                <p className="text-sm text-muted-foreground">Total Unpaid Instances</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">Analysis Period</p>
                <p className="text-base font-semibold">
                  {analysis.analysis_period.months_analyzed} months
                </p>
              </div>
            </div>

            {/* Results Table */}
            {analysis.results.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="font-semibold">
                    Students with Payment Issues ({analysis.results.length})
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllStudents}>
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setGenerateDialogOpen(true)}
                      disabled={selectedStudents.length === 0}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Generate Debts ({selectedStudents.length})
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedStudents.length === analysis.results.length}
                            onChange={(e) =>
                              e.target.checked ? selectAllStudents() : setSelectedStudents([])
                            }
                          />
                        </TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Unpaid Months</TableHead>
                        <TableHead className="text-center">Total Payments</TableHead>
                        <TableHead className="text-right">Current Debt</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.results.map((result) => (
                        <>
                          <TableRow key={result.student_id} className="hover:bg-muted/50">
                            <TableCell className="w-10">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedStudents.includes(result.student_id)}
                                onChange={() => toggleStudentSelection(result.student_id)}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-semibold">{result.student_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {result.enrollment_number}
                              </p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={result.unpaid_months_count > 3 ? 'destructive' : 'secondary'}
                                className={cn(
                                  result.unpaid_months_count <= 3 &&
                                    'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                )}
                              >
                                {result.unpaid_months_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {result.total_payments}
                            </TableCell>
                            <TableCell className="text-right">
                              ${result.total_debt_balance.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <button
                                className="p-1 rounded hover:bg-muted"
                                onClick={() =>
                                  setExpandedStudent(
                                    expandedStudent === result.student_id
                                      ? null
                                      : result.student_id
                                  )
                                }
                              >
                                {expandedStudent === result.student_id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </TableCell>
                          </TableRow>
                          {expandedStudent === result.student_id && (
                            <TableRow key={`${result.student_id}-detail`}>
                              <TableCell colSpan={6} className="py-0">
                                <div className="p-4 bg-muted/30">
                                  <p className="text-sm font-medium mb-2">Unpaid Months:</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {result.unpaid_months.map((month, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className="border-amber-400 text-amber-700"
                                      >
                                        {month.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  All students have made payments for the analyzed period!
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Generate Debts Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Debt Records</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will create debt records for {selectedStudents.length} selected student(s).
            </p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="monthlyFee">Monthly Fee Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="monthlyFee"
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateDebts}
                disabled={generating || !monthlyFee}
              >
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DebtAnalyzer;
