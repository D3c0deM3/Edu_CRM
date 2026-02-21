import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, User, Lock, Eye, EyeOff,
  GraduationCap, Users, ShieldCheck, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch, useAppSelector } from '../../features/crm/hooks';
import { setLoading, loginSuccess, loginFailure } from '../../slices/authSlice';
import { authAPI } from '../../shared/api/api';
import { showToast, handleApiError } from '../../utils/toast';

interface LoginPageProps {
  userType: 'superuser' | 'teacher' | 'student';
}

const roleConfig = {
  superuser: {
    icon: ShieldCheck,
    title: 'Administrator',
    subtitle: 'Full system access & management',
    gradient: 'from-indigo-500 to-violet-500',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    btnGradient: 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
    shadow: 'shadow-indigo-500/40',
  },
  teacher: {
    icon: Users,
    title: 'Teacher',
    subtitle: 'Manage classes, grades & students',
    gradient: 'from-pink-400 to-rose-500',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    btnGradient: 'bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600',
    shadow: 'shadow-rose-500/40',
  },
  student: {
    icon: GraduationCap,
    title: 'Student',
    subtitle: 'Access your tests, grades & portal',
    gradient: 'from-sky-400 to-cyan-400',
    accentColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    btnGradient: 'bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-500 hover:to-cyan-500',
    shadow: 'shadow-sky-500/40',
  },
};

const otherRoles = {
  superuser: [
    { type: 'teacher' as const, label: 'Teacher Login', path: '/login/teacher' },
    { type: 'student' as const, label: 'Student Login', path: '/login/student' },
  ],
  teacher: [
    { type: 'superuser' as const, label: 'Admin Login', path: '/login/superuser' },
    { type: 'student' as const, label: 'Student Login', path: '/login/student' },
  ],
  student: [
    { type: 'superuser' as const, label: 'Admin Login', path: '/login/superuser' },
    { type: 'teacher' as const, label: 'Teacher Login', path: '/login/teacher' },
  ],
};

export const LoginPage = ({ userType }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const config = roleConfig[userType];
  const RoleIcon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      let response;
      let userData;
      let token;

      if (userType === 'superuser') {
        response = await authAPI.loginSuperuser({ username, password });
        const { superuser } = response.data;
        userData = {
          id: superuser.superuser_id,
          username: superuser.username,
          email: superuser.email,
          first_name: superuser.first_name,
          last_name: superuser.last_name,
          role: superuser.role,
          userType: 'superuser' as const,
          center_id: superuser.center_id || 1,
        };
        token = response.data.token || `superuser-token-${Date.now()}`;
      } else if (userType === 'teacher') {
        response = await authAPI.loginTeacher({ username, password });
        const { teacher } = response.data;
        userData = {
          id: teacher.teacher_id,
          username: username,
          email: teacher.email,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          role: 'teacher',
          roles: teacher.roles || ['teacher'],
          userType: 'teacher' as const,
          center_id: teacher.center_id || 1,
        };
        token = response.data.token || `teacher-token-${Date.now()}`;
      } else if (userType === 'student') {
        response = await authAPI.loginStudent({ username, password });
        const { student } = response.data;
        userData = {
          id: student.student_id,
          username: username,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          role: 'student',
          userType: 'student' as const,
          center_id: student.center_id || 1,
          class_id: student.class_id,
        };
        token = response.data.token || `student-token-${Date.now()}`;
      }

      dispatch(loginSuccess({ user: userData!, token }));
      showToast.success('Login successful! Redirecting...');

      if (userType === 'student') navigate('/student-portal');
      else if (userType === 'teacher') navigate('/teacher-portal');
      else navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      dispatch(loginFailure(errorMessage));
      showToast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.12)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.12)_0%,transparent_50%)]" />

      {/* Left side - branding */}
      <div className="flex-1 hidden md:flex flex-col justify-center items-center relative p-12">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-[0.08]', config.gradient)} />
        <div className="text-center relative z-10 max-w-[480px] animate-in fade-in slide-in-from-left-4 duration-700">
          {/* Logo */}
          <div className={cn(
            'w-24 h-24 rounded-[28px] mx-auto mb-8 flex items-center justify-center shadow-2xl',
            `bg-gradient-to-br ${config.gradient} ${config.shadow}`,
            '-rotate-[5deg] hover:rotate-0 hover:scale-105 transition-transform duration-300'
          )}>
            <RoleIcon className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Education<br />
            <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', config.gradient)}>CRM System</span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-8">
            Manage students, classes, attendance, grades, and payments — all in one powerful platform.
          </p>

          <div className="flex gap-2 flex-wrap justify-center">
            {['Classes', 'Attendance', 'Grades', 'Tests', 'Payments'].map((feat) => (
              <span
                key={feat}
                className="px-3 py-1 text-xs font-medium rounded-full bg-white/[0.08] text-white/60 border border-white/10"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 md:flex-none md:w-[520px] flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Mobile logo */}
          <div className="flex md:hidden justify-center mb-8">
            <div className={cn(
              'w-16 h-16 rounded-[18px] flex items-center justify-center shadow-2xl',
              `bg-gradient-to-br ${config.gradient} ${config.shadow}`
            )}>
              <RoleIcon className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* Role badge */}
          <Badge variant="outline" className={cn('mb-4', config.badgeBg)}>
            <RoleIcon className="w-4 h-4 mr-1.5" />
            {config.title}
          </Badge>

          <h2 className="text-3xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-white/45 mb-6">{config.subtitle}</p>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-500/10 text-red-300 border-red-500/20">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 h-11"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn('w-full h-12 text-[0.95rem] font-semibold text-white shadow-2xl transition-all duration-300 hover:-translate-y-0.5', config.btnGradient, config.shadow)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[0.65rem] text-white/25 uppercase tracking-widest">switch role</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Other role buttons */}
          <div className="flex gap-2">
            {otherRoles[userType].map((role) => {
              const OtherIcon = roleConfig[role.type].icon;
              return (
                <Button
                  key={role.type}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(role.path)}
                  className={cn(
                    'flex-1 text-white/50 border-white/10 bg-transparent hover:border-current',
                    `hover:${roleConfig[role.type].accentColor}`
                  )}
                >
                  <OtherIcon className="w-4 h-4 mr-1.5" />
                  {role.label}
                </Button>
              );
            })}
          </div>

          <p className="text-center mt-6 text-white/20 text-[0.7rem]">
            Education CRM &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};
