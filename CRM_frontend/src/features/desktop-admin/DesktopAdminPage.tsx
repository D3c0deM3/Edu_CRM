import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { desktopAdminAPI } from '../../shared/api/api';
import { showToast, handleApiError } from '../../utils/toast';

type DesktopUser = {
  desktop_user_id: number;
  username: string;
  email: string | null;
  status: 'active' | 'inactive';
  subscription_activated_at: string | null;
  subscription_expires_at: string | null;
  subscription_days_used: number;
  subscription_days_remaining: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const DesktopAdminPage = () => {
  const [token, setToken] = useState(() => localStorage.getItem('desktopAdminToken') || '');
  const [username, setUsername] = useState('Decode');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<DesktopUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const isAuthenticated = Boolean(token);

  const loadUsers = useCallback(async () => {
    if (!localStorage.getItem('desktopAdminToken')) {
      return;
    }

    setLoading(true);
    try {
      const response = await desktopAdminAPI.getUsers();
      setUsers(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('desktopAdminToken');
        setToken('');
      }
      showToast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === 'active').length;
    const inactive = users.length - active;
    const expiringSoon = users.filter(
      (user) => user.status === 'active' && user.subscription_days_remaining <= 5
    ).length;

    return { total: users.length, active, inactive, expiringSoon };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [user.username, user.email || '', user.status].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [query, users]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);

    try {
      const response = await desktopAdminAPI.login({ username, password });
      localStorage.setItem('desktopAdminToken', response.data.token);
      setToken(response.data.token);
      setPassword('');
      showToast.success('Desktop admin login successful');
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('desktopAdminToken');
    setToken('');
    setUsers([]);
  };

  const changeStatus = async (user: DesktopUser, nextStatus: 'active' | 'inactive') => {
    setActionId(user.desktop_user_id);
    try {
      if (nextStatus === 'active') {
        await desktopAdminAPI.activateUser(user.desktop_user_id);
      } else {
        await desktopAdminAPI.deactivateUser(user.desktop_user_id);
      }
      await loadUsers();
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setActionId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal">Desktop Admin</h1>
              <p className="text-sm text-zinc-400">Subscription control panel</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="desktop-admin-username">
                Login
              </label>
              <Input
                id="desktop-admin-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="border-zinc-700 bg-zinc-950 text-white"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200" htmlFor="desktop-admin-password">
                Password
              </label>
              <Input
                id="desktop-admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-zinc-700 bg-zinc-950 text-white"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" disabled={authLoading} className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
              {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Desktop App Admin
            </div>
            <h1 className="text-3xl font-bold tracking-normal">Subscriptions</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Total users</p>
            <p className="mt-2 text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Active</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Inactive</p>
            <p className="mt-2 text-3xl font-bold text-zinc-500">{stats.inactive}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Expiring soon</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.expiringSoon}</p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Desktop users</h2>
              <p className="text-sm text-zinc-500">Activate, renew, and deactivate 30-day subscriptions.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Days</th>
                  <th className="px-4 py-3 font-semibold">Activated</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Last login</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      No desktop users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isActive = user.status === 'active';
                    return (
                      <tr key={user.desktop_user_id} className="align-top hover:bg-zinc-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-zinc-950">{user.username}</div>
                          <div className="text-xs text-zinc-500">{user.email || 'No email'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={
                              isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                            }
                          >
                            {isActive ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                            {user.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium">{user.subscription_days_remaining}</span>
                            <span className="text-zinc-500">left</span>
                          </div>
                          <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, (user.subscription_days_remaining / 30) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-zinc-600">{formatDate(user.subscription_activated_at)}</td>
                        <td className="px-4 py-4 text-zinc-600">{formatDate(user.subscription_expires_at)}</td>
                        <td className="px-4 py-4 text-zinc-600">{formatDate(user.last_login)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => changeStatus(user, 'active')}
                              disabled={actionId === user.desktop_user_id}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {actionId === user.desktop_user_id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
                              )}
                              Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changeStatus(user, 'inactive')}
                              disabled={actionId === user.desktop_user_id || !isActive}
                            >
                              <UserRoundX className="mr-1 h-3.5 w-3.5" />
                              Inactive
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DesktopAdminPage;
