import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
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
  section?: string | null;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id?: number;
  created_at?: string;
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
  showManualSection?: boolean;
  showQrSection?: boolean;
  manualMode?: 'full' | 'quick';
}

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Half Day'] as const;

const todayIso = () => new Date().toISOString().split('T')[0];
const DEFAULT_QR_EXPIRY_MINUTES = 10;
const DEFAULT_QR_RADIUS_METERS = 75;
const quietQrRequest = {
  silentErrorToast: true,
  silentSuccessToast: true,
};

const dateOnly = (value?: string | null) => {
  if (!value) {
    return '';
  }

  return String(value).split('T')[0];
};

const wasRegisteredByDate = (student: Student, attendanceDate: string) => {
  const registeredDate = dateOnly(student.created_at);
  return !registeredDate || registeredDate <= attendanceDate;
};

const getLessonExpiryMinutes = (classInfo?: ClassInfo, attendanceDate?: string) => {
  if (!classInfo?.section || !attendanceDate) {
    return DEFAULT_QR_EXPIRY_MINUTES;
  }

  try {
    const schedule = JSON.parse(classInfo.section);
    if (!schedule.endTime) {
      return DEFAULT_QR_EXPIRY_MINUTES;
    }

    const lessonEndsAt = new Date(`${attendanceDate}T${schedule.endTime}:00`);
    const minutesUntilEnd = Math.ceil((lessonEndsAt.getTime() - Date.now()) / 60000);
    return Math.min(Math.max(minutesUntilEnd, 1), 120);
  } catch {
    return DEFAULT_QR_EXPIRY_MINUTES;
  }
};

const requestBrowserPosition = (
  options: PositionOptions
): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

const getCurrentPosition = (): Promise<{
  location_latitude: number;
  location_longitude: number;
  location_accuracy_meters: number | null;
}> =>
  new Promise(async (resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    try {
      let position: GeolocationPosition;

      try {
        position = await requestBrowserPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      } catch (firstError: any) {
        if (firstError?.code !== 3) {
          throw firstError;
        }

        position = await requestBrowserPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        });
      }

      resolve({
        location_latitude: position.coords.latitude,
        location_longitude: position.coords.longitude,
        location_accuracy_meters: position.coords.accuracy ?? null,
      });
    } catch (error: any) {
      if (error?.code === 1) {
        reject(new Error('Location access was blocked. Allow browser location permission and try again.'));
        return;
      }

      if (error?.code === 2) {
        reject(new Error('Your location could not be determined. Check GPS/network access or try again.'));
        return;
      }

      if (error?.code === 3) {
        reject(
          new Error(
            'Location lookup timed out. Try again near a window/open area, or turn off "Require nearby location".'
          )
        );
        return;
      }

      reject(new Error(error?.message || 'Unable to capture your current location.'));
    }
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
    raw.active !== undefined
      ? Boolean(raw.active)
      : Boolean(raw.is_active) && new Date(raw.expires_at).getTime() > Date.now(),
  location_required: Boolean(raw.location_required),
  location_radius_meters: raw.location_radius_meters,
});

const TeacherAttendanceTab = ({
  teacherId,
  onRefresh,
  showManualSection = true,
  showQrSection = true,
  manualMode = 'full',
}: TeacherAttendanceTabProps) => {
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
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrHint, setQrHint] = useState<string | null>(null);

  const selectedClassInfo = useMemo(
    () => classes.find((classItem) => classItem.class_id === selectedClass) || null,
    [classes, selectedClass]
  );
  const isTeacherScoped = teacherId != null;
  const isQuickManualMode = showManualSection && !showQrSection && manualMode === 'quick';
  const resolvedAttendanceTeacherId = teacherId ?? selectedClassInfo?.teacher_id ?? null;

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
    if (classes.length === 1 && !selectedClass) {
      setSelectedClass(classes[0].class_id);
    }
  }, [classes, selectedClass]);

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
    if (showQrSection) {
      loadActiveQrSession();
    } else {
      setQrSession(null);
      setQrSessionDetails(null);
      setQrImageUrl(null);
      setQrError(null);
    }
  }, [selectedClass, attendanceDate, showQrSection]);

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
        isTeacherScoped
          ? allClasses.filter((classItem: ClassInfo) => Number(classItem.teacher_id) === Number(teacherId))
          : allClasses;
      setClasses(isTeacherScoped ? teacherClasses : allClasses);
    } catch (loadError) {
      console.error('Error loading classes:', loadError);
      setError(`Unable to load ${isTeacherScoped ? 'your' : 'available'} classes right now.`);
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
        (student: Student) =>
          Number(student.class_id) === Number(selectedClass) &&
          wasRegisteredByDate(student, attendanceDate)
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
    if (!selectedClass || !showQrSection) {
      return;
    }

    try {
      setQrLoading(true);
      setQrError(null);
      const response = await attendanceAPI.getQrSessions({
        class_id: selectedClass,
        attendance_date: attendanceDate,
        active_only: false,
      }, quietQrRequest);
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
      const response = await attendanceAPI.getQrSession(sessionToken, quietQrRequest);
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
    if (!selectedClass || !resolvedAttendanceTeacherId) {
      setError('This class needs an assigned teacher before attendance can be saved.');
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
        teacher_id: resolvedAttendanceTeacherId,
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
        expires_in_minutes: getLessonExpiryMinutes(
          classes.find((classItem) => Number(classItem.class_id) === Number(selectedClass)),
          attendanceDate
        ),
        location_radius_meters: DEFAULT_QR_RADIUS_METERS,
      };
      let locationLockEnabled = false;

      try {
        const location = await getCurrentPosition();
        Object.assign(payload, location);
        payload.location_required = true;
        locationLockEnabled = true;
      } catch (locationError: any) {
        payload.location_required = false;
        console.warn('QR session created without location lock:', locationError);
      }

      const response = await attendanceAPI.createQrSession(payload);
      const createdSession = hydrateQrSession(response.data.session);
      setQrSession(createdSession);
      setQrSessionDetails({
        session: createdSession,
        roster: students.map((student) => ({
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          enrollment_number: student.enrollment_number,
          attendance_status: attendance.get(student.student_id)?.status || null,
          checked_in_at: null,
          distance_meters: null,
          location_validated: null,
        })),
        summary: {
          total_students: students.length,
          checked_in_students: 0,
        },
      });
      setQrHint(
        locationLockEnabled
          ? `QR is live. Nearby check-in is locked to ${DEFAULT_QR_RADIUS_METERS}m around your current location for all ${students.length} students in this class.`
          : `QR is live for all ${students.length} students in this class. Location took too long, so this session was created without nearby-location lock.`
      );
      onRefresh?.();
      void loadQrSessionDetails(createdSession.session_token, false);
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
        <h3 className="text-lg font-semibold">
          {showQrSection && showManualSection
            ? 'Take Attendance'
            : showQrSection
              ? 'QR Attendance'
              : 'Manual Attendance'}
        </h3>
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
              <option value="">-- Select a class --</option>
              {classes.map((classItem) => (
                <option key={classItem.class_id} value={classItem.class_id}>
                  {classItem.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!classes.length && !loading && (
        <Alert>
          <AlertDescription>
            {isTeacherScoped
              ? 'No classes are assigned to this teacher yet, so only your own classes are shown here.'
              : 'No classes are available yet for attendance.'}
          </AlertDescription>
        </Alert>
      )}

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

      {showQrSection && (
      <Card className="border-border/70 bg-card/90 shadow-sm">
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
            <Alert className="border-blue-300/60 bg-blue-500/10 text-blue-700 dark:text-blue-200">
              <AlertDescription>{qrHint}</AlertDescription>
            </Alert>
          )}

          {!selectedClass ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center">
              <QrCode className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">Select a class first</p>
              <p className="text-sm text-muted-foreground">The QR session will use the selected class and date.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5">
                <div className="rounded-2xl border border-border p-4 space-y-4 bg-card/70">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-muted/40 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Class</p>
                      <p className="mt-1 font-semibold text-foreground">{selectedClassInfo?.class_name}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Students</p>
                      <p className="mt-1 font-semibold text-foreground">{students.length}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Radius</p>
                      <p className="mt-1 font-semibold text-foreground">{DEFAULT_QR_RADIUS_METERS}m default</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-300/30 bg-indigo-500/10 p-4">
                    <p className="font-medium text-foreground">One-click QR attendance</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      One click generates a live QR immediately for all {students.length} students in this class.
                      If your device location responds in time, the session automatically uses a {DEFAULT_QR_RADIUS_METERS}m nearby check-in lock.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Room: {selectedClassInfo?.room_number || 'Not specified'}
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={handleCreateQrSession}
                      disabled={qrBusy}
                      className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 min-w-[210px]"
                    >
                      {qrBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating QR...
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          {qrSession?.active ? 'Regenerate Live QR' : 'Generate Live QR'}
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

                <div className="rounded-2xl border border-border p-4 bg-muted/30">
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
                          className="w-full max-w-[340px] mx-auto"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Smartphone className="h-4 w-4 text-indigo-500" />
                          Students scan this and attendance is marked automatically.
                        </div>
                        <div className="text-xs text-muted-foreground break-all rounded-xl border bg-background px-3 py-2">
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
                      <QrCode className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="font-medium text-foreground">QR code will appear here</p>
                      <p className="text-sm text-muted-foreground">
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
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b">
                    <div>
                      <p className="font-medium text-foreground">Live QR check-ins</p>
                      <p className="text-sm text-muted-foreground">
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
                      <TableRow className="bg-muted/40">
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
      )}

      {showManualSection && (!selectedClass ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed border-border">
          <CalendarDays className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Select a class to take attendance</h3>
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
          <div className={cn('grid gap-3', isQuickManualMode ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
            <Card className="bg-green-500/10 text-center border-green-500/20">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 text-center border-red-500/20">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-red-500">{attendanceStats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            {!isQuickManualMode && (
            <Card className="bg-amber-500/10 text-center border-amber-500/20">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-amber-500">{attendanceStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            )}
            {!isQuickManualMode && (
            <Card className="bg-blue-500/10 text-center border-blue-500/20">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-blue-500">{attendanceStats.halfDay}</p>
                <p className="text-xs text-muted-foreground">Half Day</p>
              </CardContent>
            </Card>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" className="border-green-400/60 text-green-600 hover:bg-green-500/10 dark:text-green-300" onClick={markAllPresent}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Present
            </Button>
            <Button variant="outline" className="border-red-400/60 text-red-600 hover:bg-red-500/10 dark:text-red-300" onClick={markAllAbsent}>
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
            <Alert className="border-blue-300/60 bg-blue-500/10 text-blue-700 dark:text-blue-200">
              <AlertDescription>
                Attendance already exists for this date. Saving will update the existing records instead of duplicating them.
              </AlertDescription>
            </Alert>
          )}

          <div className="border border-border rounded-md overflow-hidden bg-card/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead className={cn(isQuickManualMode ? 'w-[240px]' : 'w-[320px]')}>Status</TableHead>
                  {!isQuickManualMode && <TableHead>Notes</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const record = attendance.get(student.student_id);

                  return (
                    <TableRow key={student.student_id} className="hover:bg-muted/30">
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
                          {(isQuickManualMode
                            ? (['Present', 'Absent'] as const)
                            : STATUS_OPTIONS
                          ).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.student_id, status)}
                              className={cn(
                                'px-2.5 py-1.5 text-xs rounded-md border transition-colors',
                                record?.status === status
                                  ? status === 'Present'
                                    ? 'bg-green-500 text-white border-green-500'
                                    : status === 'Absent'
                                      ? 'bg-red-500 text-white border-red-500'
                                      : status === 'Late'
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-background text-muted-foreground border-border hover:bg-muted/40'
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
                      {!isQuickManualMode && (
                      <TableCell>
                        <Input
                          placeholder="Add notes..."
                          value={record?.notes || ''}
                          onChange={(event) => handleNotesChange(student.student_id, event.target.value)}
                          className="w-52 h-8 text-sm"
                        />
                      </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ))}

      {showManualSection && (
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
      )}
    </div>
  );
};

export default TeacherAttendanceTab;
