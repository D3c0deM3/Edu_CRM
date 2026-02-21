import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Shield, ArrowRight, ArrowLeft, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch, useAppSelector } from '../../features/crm/hooks';
import { setLoading, loginSuccess, loginFailure } from '../../slices/authSlice';
import { showToast } from '../../utils/toast';

export const OwnerLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      if (username === 'Muzaffar' && password === '123456789') {
        dispatch(
          loginSuccess({
            user: {
              id: 0,
              username: 'Muzaffar',
              email: 'owner@crm.com',
              first_name: 'Muzaffar',
              last_name: 'Owner',
              role: 'Owner',
              userType: 'superuser',
              center_id: 0,
            },
            token: 'owner-token-' + Date.now(),
          })
        );

        showToast.success('Owner login successful! Accessing manager panel...');
        navigate('/owner/manage');
      } else {
        const errorMsg = 'Invalid credentials. Please check username and password.';
        dispatch(loginFailure(errorMsg));
        showToast.error(errorMsg);
      }
    } catch {
      const errorMsg = 'Login failed. Please try again.';
      dispatch(loginFailure(errorMsg));
      showToast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(245,175,25,0.12)_0%,transparent_50%),radial-gradient(circle_at_70%_30%,rgba(241,39,17,0.12)_0%,transparent_50%)]" />

      <div className="relative z-10 w-full max-w-[440px] px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/login/superuser')}
          className="mb-6 text-white/40 hover:text-white/70"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Login
        </Button>

        {/* Icon */}
        <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/40 -rotate-[5deg] hover:rotate-0 hover:scale-105 transition-transform duration-300">
          <Shield className="w-11 h-11 text-white" />
        </div>

        {/* Badge */}
        <Badge variant="outline" className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Shield className="w-3.5 h-3.5 mr-1.5" />
          Restricted Access
        </Badge>

        <h2 className="text-3xl font-bold text-white mb-1">Owner Panel</h2>
        <p className="text-white/45 mb-6">System owner & manager access only</p>

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
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
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
              className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
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
            className="w-full h-12 text-[0.95rem] font-semibold text-white bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-500 hover:to-red-600 shadow-2xl shadow-amber-500/35 transition-all duration-300 hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Access Manager Panel
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-white/20 text-[0.7rem]">
          Education CRM &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
