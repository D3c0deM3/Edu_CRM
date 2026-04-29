import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppSelector } from '../crm/hooks';
import type { RootState } from '../../store';
import { attendanceAPI } from '../../shared/api/api';
import { cn } from '@/lib/utils';

interface SessionInfo {
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

interface StudentSessionResponse {
  session: SessionInfo;
  eligible: boolean;
  already_checked_in: boolean;
  check_in?: {
    checked_in_at?: string;
    distance_meters?: number | null;
    location_validated?: boolean;
  } | null;
}

const quietQrRequest = {
  silentErrorToast: true,
  silentSuccessToast: true,
};

const requestBrowserPosition = (
  options: PositionOptions
): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

const getCurrentPosition = (): Promise<{
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
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
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy ?? null,
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
            'Location lookup timed out. Try again near a window/open area, or ask the teacher to generate QR without location lock.'
          )
        );
        return;
      }

      reject(new Error(error?.message || 'Unable to get your current location.'));
    }
  });

const StudentQrAttendancePage = () => {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<StudentSessionResponse | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionToken || !user || user.userType !== 'student') {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await attendanceAPI.getQrSession(sessionToken, quietQrRequest);
      setSessionData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to load this QR attendance session.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, user]);

  useEffect(() => {
    if (!sessionToken) {
      setLoading(false);
      setError('Missing QR attendance session.');
      return;
    }

    if (!isAuthenticated || !user) {
      navigate(`/login/student?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    if (user.userType !== 'student') {
      setLoading(false);
      setError('Only student accounts can use QR attendance check-in.');
      return;
    }

    loadSession();
  }, [isAuthenticated, loadSession, location.pathname, navigate, sessionToken, user]);

  const handleCheckIn = async () => {
    if (!sessionToken || !sessionData?.session) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = sessionData.session.location_required
        ? await getCurrentPosition()
        : {};

      await attendanceAPI.checkInQrSession(sessionToken, payload, quietQrRequest);
      await loadSession();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to complete attendance check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const expiryText = useMemo(() => {
    if (!sessionData?.session?.expires_at) {
      return null;
    }

    return new Date(sessionData.session.expires_at).toLocaleString();
  }, [sessionData?.session?.expires_at]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-cyan-400" />
          <p className="text-sm text-white/65">Loading attendance session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white px-4 py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <Card className="border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 w-fit">
              <QrCode className="h-3.5 w-3.5" />
              QR Attendance
            </div>
            <CardTitle className="text-2xl text-white">Class Check-In</CardTitle>
            <p className="text-sm text-white/65">
              Confirm your attendance with your logged-in student account.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert className="border-red-400/35 bg-red-500/10 text-red-100">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {sessionData?.session && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">Class</p>
                    <p className="text-lg font-semibold">
                      {sessionData.session.class_name}
                    </p>
                    <p className="text-sm text-white/55">{sessionData.session.class_code || 'Class session'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">Teacher</p>
                    <p className="text-lg font-semibold">
                      {sessionData.session.teacher_name || 'Assigned teacher'}
                    </p>
                    <p className="text-sm text-white/55">
                      {new Date(sessionData.session.attendance_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-white/20 text-white',
                        sessionData.session.active
                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30'
                          : 'bg-red-500/10 text-red-200 border-red-400/30'
                      )}
                    >
                      <Clock3 className="h-3 w-3 mr-1" />
                      {sessionData.session.active ? 'Session Open' : 'Session Closed'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-white/20 text-white',
                        sessionData.eligible
                          ? 'bg-cyan-500/10 text-cyan-200 border-cyan-400/30'
                          : 'bg-amber-500/10 text-amber-200 border-amber-400/30'
                      )}
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {sessionData.eligible ? 'Class Match' : 'Wrong Class'}
                    </Badge>
                    {sessionData.session.location_required && (
                      <Badge
                        variant="outline"
                        className="border-indigo-400/30 bg-indigo-500/10 text-indigo-100"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Location Check
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-white/70">
                    <p>
                      Expires: <span className="text-white">{expiryText}</span>
                    </p>
                    <p>
                      Room: <span className="text-white">{sessionData.session.room_number || 'Not specified'}</span>
                    </p>
                    {sessionData.session.location_required && (
                      <p>
                        Allowed distance: <span className="text-white">{Math.round(Number(sessionData.session.location_radius_meters || 0))}m</span>
                      </p>
                    )}
                  </div>
                </div>

                {sessionData.already_checked_in ? (
                  <Alert className="border-emerald-400/35 bg-emerald-500/10 text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Checked in successfully
                      {sessionData.check_in?.checked_in_at
                        ? ` on ${new Date(sessionData.check_in.checked_in_at).toLocaleString()}`
                        : ''}
                      .
                    </AlertDescription>
                  </Alert>
                ) : null}

                {!sessionData.session.active && (
                  <Alert className="border-amber-400/35 bg-amber-500/10 text-amber-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>This attendance session is no longer accepting check-ins.</AlertDescription>
                  </Alert>
                )}

                {!sessionData.eligible && (
                  <Alert className="border-red-400/35 bg-red-500/10 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This QR code is for a different class than the one assigned to your account.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCheckIn}
                    disabled={
                      submitting ||
                      !sessionData.session.active ||
                      !sessionData.eligible ||
                      sessionData.already_checked_in
                    }
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Me Present
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={loadSession}
                    className="border-white/15 bg-white/[0.03] hover:bg-white/[0.08]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-white/45">
          <Link to="/student-portal" className="hover:text-white transition-colors">
            Return to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentQrAttendancePage;
