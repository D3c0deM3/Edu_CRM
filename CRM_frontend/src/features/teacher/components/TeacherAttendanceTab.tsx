import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  StopCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { attendanceAPI, classAPI, studentAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
  teacher_id?: number | null;
  room_number?: string | null;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id?: number;
}

interface AttendanceRecord {
  student_id: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  notes?: string;
}

interface QrRosterStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  attendance_status?: string | null;
  checked_in_at?: string | null;
  distance_meters?: number | null;
  location_validated?: boolean | null;
}

interface QrSessionInfo {
  session_id: number;
  session_token: string;
  class_id: number;
  class_name: string;
  class_code?: string;
  teacher_id: number;
  teacher_name?: string | null;
  attendance_date: string;
  room_number?: string | null;
  created_at?: string;
  expires_at: string;
  active: boolean;
  location_required: boolean;
  location_radius_meters?: number | null;
}

interface QrSessionDetailsResponse {
  session: QrSessionInfo;
  roster: QrRosterStudent[];
  summary?: {
    total_students: number;
    checked_in_students: number;
  };
}

interface TeacherAttendanceTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Half Day'] as const;

const todayIso = () => new Date().toISOString().split('T')[0];

const getCurrentPosition = (): Promise<{
  location_latitude: number;
  location_longitude: number;
  location_accuracy_meters: number | null;
}> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          location_latitude: position.coords.latitude,
          location_longitude: position.coords.longitude,
          location_accuracy_meters: position.coords.accuracy ?? null,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Unable to capture your current location.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });

const hydrateQrSession = (raw: any): QrSessionInfo => ({
  session_id: raw.session_id,
  session_token: raw.session_token,
  class_id: raw.class_id,
  class_name: raw.class_name,
  class_code: raw.class_code,
  teacher_id: raw.teacher_id,
  teacher_name:
    raw.teacher_name ||
    (raw.teacher_first_name && raw.teacher_last_name
      ? `${raw.teacher_first_name} ${raw.teacher_last_name}`
      : null),
  attendance_date: raw.attendance_date,
  room_number: raw.room_number || raw.room_number_snapshot || null,
  created_at: raw.created_at,
  expires_at: raw.expires_at,
  active:
    Boolean(raw.active ?? raw.is_active) &&
    new Date(raw.expires_at).getTime() > Date.now(),
  location_required: Boolean(raw.location_required),
  location_radius_meters: raw.location_radius_meters,
});

const TeacherAttendanceTab = ({ teacherId, onRefresh }: TeacherAttendanceTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(todayIso());
  const [attendance, setAttendance] = useState<Map<number, AttendanceRecord>>(new Map());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrSession, setQrSession] = useState<QrSessionInfo | null>(null);
  const [qrSessionDetails, setQrSessionDetails] = useState<QrSessionDetailsResponse | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState('10');
  const [qrRequireLocation, setQrRequireLocation] = useState(false);
  const [qrRadiusMeters, setQrRadiusMeters] = useState('75');
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrHint, setQrHint] = useState<string | null>(null);

  const selectedClassInfo = useMemo(
    () => classes.find((classItem) => classItem.class_id === selectedClass) || null,
    [classes, selectedClass]
  );

  const qrCheckInUrl = useMemo(() => {
    if (!qrSession?.session_token || typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}/attendance/qr-check-in/${qrSession.session_token}`;
  }, [qrSession?.session_token]);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setExistingAttendance([]);
      setAttendance(new Map());
      setQrSession(null);
      setQrSessionDetails(null);
      setQrImageUrl(null);
      return;
    }

    loadClassStudentsAndAttendance();
    loadActiveQrSession();
  }, [selectedClass, attendanceDate]);

  useEffect(() => {
    if (!qrCheckInUrl) {
      setQrImageUrl(null);
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(qrCheckInUrl, {
      width: 360,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl: string) => {
        if (!cancelled) {
          setQrImageUrl(dataUrl);
        }
      })
      .catch((qrGenerationError: unknown) => {
        console.error('Failed to generate QR image:', qrGenerationError);
        if (!cancelled) {
          setQrImageUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrCheckInUrl]);

  useEffect(() => {
    if (!qrSession?.session_token || !qrSession.active) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadQrSessionDetails(qrSession.session_token, false);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [qrSession?.session_token, qrSession?.active]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      const allClasses = Array.isArray(response.data) ? response.data : [];
      const teacherClasses =
        teacherId != null
          ? allClasses.filter((classItem: ClassInfo) => Number(classItem.teacher_id) === Number(teacherId))
          : allClasses;
      setClasses(teacherClasses.length > 0 ? teacherClasses : allClasses);
    } catch (loadError) {
      console.error('Error loading classes:', loadError);
      setError('Unable to load your classes right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudentsAndAttendance = async () => {
    if (!selectedClass) {
      return;
    }

    try {
      setStudentsLoading(true);
      const [studentsResponse, attendanceResponse] = await Promise.all([
        studentAPI.getAll(),
        attendanceAPI.getByClass(selectedClass),
      ]);

      const allStudents = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
      const classStudents = allStudents.filter(
        (student: Student) => Number(student.class_id) === Number(selectedClass)
      );
      const classAttendance = Array.isArray(attendanceResponse.data) ? attendanceResponse.data : [];
      const attendanceForDate = classAttendance.filter(
        (record: any) => record.attendance_date?.split('T')[0] === attendanceDate
      );

      const attendanceMap = new Map<number, AttendanceRecord>();
      classStudents.forEach((student: Student) => {
        attendanceMap.set(student.student_id, {
          student_id: student.student_id,
          status: 'Present',
          notes: '',
        });
      });

      attendanceForDate.forEach((record: any) => {
        attendanceMap.set(record.student_id, {
          student_id: record.student_id,
          status: record.status || 'Present',
          notes: record.remarks || '',
        });
      });

      setStudents(classStudents);
      setExistingAttendance(attendanceForDate);
      setAttendance(attendanceMap);
    } catch (loadError) {
      console.error('Error loading students or attendance:', loadError);
      setError('Unable to load attendance data for this class.');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadActiveQrSession = async () => {
    if (!selectedClass) {
      return;
    }

    try {
      setQrLoading(true);
      setQrError(null);
      const response = await attendanceAPI.getQrSessions({
        class_id: selectedClass,
        attendance_date: attendanceDate,
      });
      const sessions = Array.isArray(response.data) ? response.data : [];
      const latestSession = sessions.length > 0 ? hydrateQrSession(sessions[0]) : null;
      setQrSession(latestSession);

      if (latestSession) {
        await loadQrSessionDetails(latestSession.session_token, false);
      } else {
        setQrSessionDetails(null);
      }
    } catch (loadError: any) {
      console.error('Error loading QR session:', loadError);
      setQrError(loadError?.response?.data?.error || 'Unable to load QR attendance session.');
    } finally {
      setQrLoading(false);
    }
  };

  const loadQrSessionDetails = async (sessionToken: string, showBusy = true) => {
    try {
      if (showBusy) {
        setQrBusy(true);
      }
      const response = await attendanceAPI.getQrSession(sessionToken);
      const payload = response.data;
      if (payload?.session) {
        const hydratedSession = hydrateQrSession(payload.session);
        setQrSession(hydratedSession);
        setQrSessionDetails({
          ...payload,
          session: hydratedSession,
        });
      }
    } catch (loadError: any) {
      console.error('Error loading QR session details:', loadError);
      setQrError(loadError?.response?.data?.error || 'Unable to refresh QR attendance details.');
    } finally {
      if (showBusy) {
        setQrBusy(false);
      }
    }
  };

  const handleStatusChange = (
    studentId: number,
    status: 'Present' | 'Absent' | 'Late' | 'Half Day'
  ) => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' as const };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, status });
    setAttendance(updated);
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' as const };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, notes });
    setAttendance(updated);
  };

  const markAllPresent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Present',
        notes: attendance.get(student.student_id)?.notes || '',
      });
    });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Absent',
        notes: attendance.get(student.student_id)?.notes || '',
      });
    });
    setAttendance(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !teacherId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const records = Array.from(attendance.values()).map((record) => ({
        student_id: record.student_id,
        class_id: selectedClass,
        attendance_date: attendanceDate,
        status: record.status,
        remarks: record.notes || null,
        teacher_id: teacherId,
      }));

      await attendanceAPI.bulkCreate(records);
      setSuccess(`Attendance saved successfully for ${records.length} students.`);
      setShowSaveDialog(false);
      await loadClassStudentsAndAttendance();
      await loadActiveQrSession();
      onRefresh?.();
    } catch (saveError: any) {
      console.error('Error saving attendance:', saveError);
      setError(saveError?.response?.data?.error || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQrSession = async () => {
    if (!selectedClass) {
      setQrError('Choose a class before generating a QR code.');
      return;
    }

    try {
      setQrBusy(true);
      setQrError(null);
      setQrHint(null);

      const payload: Record<string, any> = {
        class_id: selectedClass,
        attendance_date: attendanceDate,
        expires_in_minutes: Number(qrExpiryMinutes) || 10,
        location_required: qrRequireLocation,
        location_radius_meters: Number(qrRadiusMeters) || 75,
      };

      if (qrRequireLocation) {
        const location = await getCurrentPosition();
        Object.assign(payload, location);
        setQrHint('Teacher location captured. Students will need to be nearby to check in.');
      }

      const response = await attendanceAPI.createQrSession(payload);
      const createdSession = hydrateQrSession(response.data.session);
      setQrSession(createdSession);
      await loadQrSessionDetails(createdSession.session_token, false);
      onRefresh?.();
    } catch (createError: any) {
      console.error('Error creating QR session:', createError);
      setQrError(
        createError?.response?.data?.error ||
          createError?.message ||
          'Unable to create a QR attendance session.'
      );
    } finally {
      setQrBusy(false);
    }
  };

  const handleCloseQrSession = async () => {
    if (!qrSession?.session_token) {
      return;
    }

    try {
      setQrBusy(true);
      setQrError(null);
      await attendanceAPI.closeQrSession(qrSession.session_token);
      await loadActiveQrSession();
      setQrHint('QR attendance session closed.');
      onRefresh?.();
    } catch (closeError: any) {
      console.error('Error closing QR session:', closeError);
      setQrError(closeError?.response?.data?.error || 'Unable to close this QR attendance session.');
    } finally {
      setQrBusy(false);
    }
  };

  const handleCopyQrLink = async () => {
    if (!qrCheckInUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(qrCheckInUrl);
      setQrHint('Check-in link copied to clipboard.');
    } catch (copyError) {
      console.error('Error copying QR link:', copyError);
      setQrHint('Unable to copy automatically. You can still share the link shown below.');
    }
  };

  const attendanceStats = useMemo(() => {
    const values = Array.from(attendance.values());
    return {
      present: values.filter((record) => record.status === 'Present').length,
      absent: values.filter((record) => record.status === 'Absent').length,
      late: values.filter((record) => record.status === 'Late').length,
      halfDay: values.filter((record) => record.status === 'Half Day').length,
    };
  }, [attendance]);

  const qrSummary = qrSessionDetails?.summary || {
    total_students: students.length,
    checked_in_students: qrSessionDetails?.roster?.filter((student) => student.checked_in_at).length || 0,
  };
  const qrLocationRequired = qrSession?.location_required ?? false;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Take Attendance</h3>
        <div className="flex gap-3 items-center flex-wrap">
          <div>
            <Label htmlFor="att-date" className="text-xs text-muted-foreground">
              Date
            </Label>
            <Input
              id="att-date"
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="att-class" className="text-xs text-muted-foreground">
              Select Class
            </Label>
            <select
              id="att-class"
              value={selectedClass}
              onChange={(event) =>
                setSelectedClass(event.target.value ? Number(event.target.value) : '')
              }
              className="flex h-9 w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">-- Select --</option>
              {classes.map((classItem) => (
                <option key={classItem.class_id} value={classItem.class_id}>
                  {classItem.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-300 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="border-indigo-200/70 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-indigo-500" />
                QR Attendance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a live QR code for the selected class so students can scan and mark themselves present.
              </p>
            </div>
            {qrSession ? (
              <Badge
                variant="outline"
                className={cn(
                  qrSession.active
                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                    : 'border-slate-300 text-slate-600 bg-slate-50'
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {qrSession.active ? 'Session Live' : 'Session Closed'}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {qrError && (
            <Alert variant="destructive">
              <AlertDescription>{qrError}</AlertDescription>
            </Alert>
          )}

          {qrHint && (
            <Alert className="border-blue-300 bg-blue-50 text-blue-800">
              <AlertDescription>{qrHint}</AlertDescription>
            </Alert>
          )}

          {!selectedClass ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              <QrCode className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="font-medium text-slate-700">Select a class first</p>
              <p className="text-sm text-slate-500">The QR session will use the selected class and date.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="qr-expiry">QR expires after</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="qr-expiry"
                          type="number"
                          min="1"
                          max="120"
                          value={qrExpiryMinutes}
                          onChange={(event) => setQrExpiryMinutes(event.target.value)}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Room</Label>
                      <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                        {selectedClassInfo?.room_number || 'Room not specified'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500" />
                          Require nearby location
                        </p>
                        <p className="text-sm text-slate-600">
                          Students will only be checked in if they are close to your current location when you generate the QR.
                        </p>
                      </div>
                      <Switch
                        checked={qrRequireLocation}
                        onCheckedChange={setQrRequireLocation}
                      />
                    </div>

                    {qrRequireLocation && (
                      <div className="space-y-1.5">
                        <Label htmlFor="qr-radius">Allowed radius</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="qr-radius"
                            type="number"
                            min="20"
                            max="500"
                            value={qrRadiusMeters}
                            onChange={(event) => setQrRadiusMeters(event.target.value)}
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">meters</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={handleCreateQrSession}
                      disabled={qrBusy}
                      className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600"
                    >
                      {qrBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preparing QR...
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          {qrSession?.active ? 'Regenerate QR' : 'Generate QR'}
                        </>
                      )}
                    </Button>
                    {qrSession ? (
                      <Button
                        variant="outline"
                        onClick={() => loadQrSessionDetails(qrSession.session_token, true)}
                        disabled={qrBusy}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Session
                      </Button>
                    ) : null}
                    {qrSession?.active ? (
                      <Button variant="outline" onClick={handleCloseQrSession} disabled={qrBusy}>
                        <StopCircle className="h-4 w-4 mr-2" />
                        Close Session
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                  {qrLoading || qrBusy ? (
                    <div className="flex min-h-[260px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                  ) : qrSession && qrImageUrl ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
                        <img
                          src={qrImageUrl}
                          alt="Attendance QR code"
                          className="w-full max-w-[280px] mx-auto"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Smartphone className="h-4 w-4 text-indigo-500" />
                          Students scan this with their phone camera.
                        </div>
                        <div className="text-xs text-slate-500 break-all rounded-xl border bg-white px-3 py-2">
                          {qrCheckInUrl}
                        </div>
                        <Button variant="outline" onClick={handleCopyQrLink} className="w-full">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Check-In Link
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[260px] flex flex-col items-center justify-center text-center px-6">
                      <QrCode className="h-12 w-12 text-slate-400 mb-3" />
                      <p className="font-medium text-slate-700">QR code will appear here</p>
                      <p className="text-sm text-slate-500">
                        Generate a session to start live QR-based attendance.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {qrSession ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="bg-emerald-50/80 border-emerald-100">
                    <CardContent className="py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/70">Checked In</p>
                      <p className="text-3xl font-bold text-emerald-700">{qrSummary.checked_in_students}</p>
                      <p className="text-sm text-emerald-700/80">students scanned successfully</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50/80 border-blue-100">
                    <CardContent className="py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-blue-700/70">Class Size</p>
                      <p className="text-3xl font-bold text-blue-700">{qrSummary.total_students}</p>
                      <p className="text-sm text-blue-700/80">students in this roster</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-indigo-50/80 border-indigo-100">
                    <CardContent className="py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-indigo-700/70">Session</p>
                      <p className="text-lg font-semibold text-indigo-700">
                        {qrSession.active ? 'Open now' : 'Closed'}
                      </p>
                      <p className="text-sm text-indigo-700/80">
                        Expires {new Date(qrSession.expires_at).toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {qrSessionDetails?.roster?.length ? (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b">
                    <div>
                      <p className="font-medium text-slate-900">Live QR check-ins</p>
                      <p className="text-sm text-slate-500">
                        Students move into the checked-in list as soon as they scan and validate.
                      </p>
                    </div>
                    {qrLocationRequired ? (
                      <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Location Guard On
                      </Badge>
                    ) : null}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Student</TableHead>
                        <TableHead>Enrollment #</TableHead>
                        <TableHead>QR Status</TableHead>
                        <TableHead>Checked In At</TableHead>
                        <TableHead>Distance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qrSessionDetails.roster.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>{student.enrollment_number}</TableCell>
                          <TableCell>
                            {student.checked_in_at ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Checked In
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-300 text-slate-500">
                                Waiting
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.checked_in_at
                              ? new Date(student.checked_in_at).toLocaleTimeString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {student.distance_meters != null
                              ? `${Math.round(Number(student.distance_meters))} m`
                              : qrLocationRequired
                                ? 'Pending'
                                : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {!selectedClass ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <CalendarDays className="h-14 w-14 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a class to take attendance</h3>
          <p className="text-sm text-muted-foreground">Choose a class from the dropdown above</p>
        </div>
      ) : studentsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No students in this class</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-green-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-red-500">{attendanceStats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-amber-500">{attendanceStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-blue-500">{attendanceStats.halfDay}</p>
                <p className="text-xs text-muted-foreground">Half Day</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="border-green-400 text-green-600 hover:bg-green-50" onClick={markAllPresent}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Present
            </Button>
            <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50" onClick={markAllAbsent}>
              <XCircle className="h-4 w-4 mr-2" />
              Mark All Absent
            </Button>
            <div className="flex-1" />
            <Button
              onClick={() => setShowSaveDialog(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Attendance
            </Button>
          </div>

          {existingAttendance.length > 0 && (
            <Alert className="border-blue-300 bg-blue-50 text-blue-800">
              <AlertDescription>
                Attendance already exists for this date. Saving will update the existing records instead of duplicating them.
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead className="w-[320px]">Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const record = attendance.get(student.student_id);

                  return (
                    <TableRow key={student.student_id} className="hover:bg-gray-50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-medium">
                            {student.first_name?.[0]}
                            {student.last_name?.[0]}
                          </div>
                          <span className="font-medium text-sm">
                            {student.first_name} {student.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{student.enrollment_number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.student_id, status)}
                              className={cn(
                                'px-2 py-1 text-xs rounded border transition-colors',
                                record?.status === status
                                  ? status === 'Present'
                                    ? 'bg-green-500 text-white border-green-500'
                                    : status === 'Absent'
                                      ? 'bg-red-500 text-white border-red-500'
                                      : status === 'Late'
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              )}
                            >
                              {status === 'Present' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                              {status === 'Absent' && <XCircle className="h-3 w-3 inline mr-1" />}
                              {status === 'Late' && <Clock className="h-3 w-3 inline mr-1" />}
                              {status === 'Half Day' ? 'HD' : status.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Add notes..."
                          value={record?.notes || ''}
                          onChange={(event) => handleNotesChange(student.student_id, event.target.value)}
                          className="w-52 h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Attendance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            You are about to save attendance for <strong>{students.length}</strong> students on{' '}
            <strong>{new Date(attendanceDate).toLocaleDateString()}</strong>.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs border border-green-400 text-green-600 rounded-full px-2.5 py-1">
              <CheckCircle className="h-3 w-3" /> {attendanceStats.present} Present
            </span>
            <span className="inline-flex items-center gap-1 text-xs border border-red-400 text-red-600 rounded-full px-2.5 py-1">
              <XCircle className="h-3 w-3" /> {attendanceStats.absent} Absent
            </span>
            <span className="inline-flex items-center gap-1 text-xs border border-amber-400 text-amber-600 rounded-full px-2.5 py-1">
              <Clock className="h-3 w-3" /> {attendanceStats.late} Late
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAttendanceTab;
