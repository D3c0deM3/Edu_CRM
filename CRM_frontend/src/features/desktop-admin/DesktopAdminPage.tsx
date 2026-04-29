import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Building2,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
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

type CrmOwner = {
  center_id: number;
  center_name: string;
  center_code: string;
  center_email: string | null;
  center_phone: string | null;
  city: string | null;
  principal_name: string | null;
  subscription_status: 'active' | 'inactive';
  subscription_activated_at: string | null;
  subscription_expires_at: string | null;
  subscription_days: number;
  subscription_days_remaining: number;
  student_limit: number | null;
  student_count: number;
  owner_superuser_id: number | null;
  owner_username: string | null;
  owner_email: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_status: string | null;
};

type CrmOwnerForm = {
  center_name: string;
  center_code: string;
  center_email: string;
  center_phone: string;
  city: string;
  principal_name: string;
  owner_username: string;
  owner_email: string;
  owner_password: string;
  owner_first_name: string;
  owner_last_name: string;
  subscription_days: string;
  student_limit: string;
  activate_now: boolean;
};

const emptyOwnerForm: CrmOwnerForm = {
  center_name: '',
  center_code: '',
  center_email: '',
  center_phone: '',
  city: '',
  principal_name: '',
  owner_username: '',
  owner_email: '',
  owner_password: '',
  owner_first_name: '',
  owner_last_name: '',
  subscription_days: '30',
  student_limit: '',
  activate_now: true,
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
  const [showPassword, setShowPassword] = useState(false);
  const [crmOwners, setCrmOwners] = useState<CrmOwner[]>([]);
  const [ownerForm, setOwnerForm] = useState<CrmOwnerForm>(emptyOwnerForm);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerSettings, setOwnerSettings] = useState<Record<number, { subscription_days: string; student_limit: string }>>({});
  const [users, setUsers] = useState<DesktopUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [crmActionId, setCrmActionId] = useState<number | null>(null);
  const [createOwnerLoading, setCreateOwnerLoading] = useState(false);

  const isAuthenticated = Boolean(token);

  const loadCrmOwners = useCallback(async () => {
    if (!localStorage.getItem('desktopAdminToken')) {
      return;
    }

    setLoading(true);
    try {
      const response = await desktopAdminAPI.getCrmOwners();
      const owners: CrmOwner[] = response.data;
      setCrmOwners(owners);
      setOwnerSettings(
        owners.reduce<Record<number, { subscription_days: string; student_limit: string }>>((acc, owner) => {
          acc[owner.center_id] = {
            subscription_days: String(owner.subscription_days || 30),
            student_limit: owner.student_limit === null || owner.student_limit === undefined ? '' : String(owner.student_limit),
          };
          return acc;
        }, {})
      );
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
      loadCrmOwners();
      loadUsers();
    }
  }, [isAuthenticated, loadCrmOwners, loadUsers]);

  const refreshAdminData = async () => {
    await Promise.all([loadCrmOwners(), loadUsers()]);
  };

  const stats = useMemo(() => {
    const active = crmOwners.filter((owner) => owner.subscription_status === 'active').length;
    const inactive = crmOwners.length - active;
    const expiringSoon = crmOwners.filter(
      (owner) => owner.subscription_status === 'active' && owner.subscription_days_remaining <= 5
    ).length;
    const totalStudents = crmOwners.reduce((total, owner) => total + owner.student_count, 0);

    return { total: crmOwners.length, active, inactive, expiringSoon, totalStudents };
  }, [crmOwners]);

  const filteredCrmOwners = useMemo(() => {
    const normalizedQuery = ownerQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return crmOwners;
    }

    return crmOwners.filter((owner) =>
      [
        owner.center_name,
        owner.center_code,
        owner.owner_username || '',
        owner.owner_email || '',
        owner.subscription_status,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [crmOwners, ownerQuery]);

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
    setCrmOwners([]);
    setUsers([]);
  };

  const parsePositiveNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  const parseLimit = (value: string) => {
    if (value.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
  };

  const createCrmOwner = async (event: FormEvent) => {
    event.preventDefault();
    setCreateOwnerLoading(true);

    try {
      await desktopAdminAPI.createCrmOwner({
        ...ownerForm,
        subscription_days: parsePositiveNumber(ownerForm.subscription_days, 30),
        student_limit: parseLimit(ownerForm.student_limit),
      });
      setOwnerForm(emptyOwnerForm);
      await loadCrmOwners();
      showToast.success('CRM owner created');
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setCreateOwnerLoading(false);
    }
  };

  const updateOwnerSetting = (centerId: number, key: 'subscription_days' | 'student_limit', value: string) => {
    setOwnerSettings((current) => ({
      ...current,
      [centerId]: {
        subscription_days: current[centerId]?.subscription_days || '30',
        student_limit: current[centerId]?.student_limit || '',
        [key]: value,
      },
    }));
  };

  const activateCrmOwner = async (owner: CrmOwner) => {
    const settings = ownerSettings[owner.center_id] || {
      subscription_days: String(owner.subscription_days || 30),
      student_limit: owner.student_limit === null ? '' : String(owner.student_limit),
    };

    setCrmActionId(owner.center_id);
    try {
      await desktopAdminAPI.activateCrmOwner(owner.center_id, {
        subscription_days: parsePositiveNumber(settings.subscription_days, 30),
        student_limit: parseLimit(settings.student_limit),
      });
      await loadCrmOwners();
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setCrmActionId(null);
    }
  };

  const saveCrmOwnerSettings = async (owner: CrmOwner) => {
    const settings = ownerSettings[owner.center_id] || {
      subscription_days: String(owner.subscription_days || 30),
      student_limit: owner.student_limit === null ? '' : String(owner.student_limit),
    };

    setCrmActionId(owner.center_id);
    try {
      await desktopAdminAPI.updateCrmOwner(owner.center_id, {
        subscription_days: parsePositiveNumber(settings.subscription_days, owner.subscription_days || 30),
        student_limit: parseLimit(settings.student_limit),
      });
      await loadCrmOwners();
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setCrmActionId(null);
    }
  };

  const deactivateCrmOwner = async (owner: CrmOwner) => {
    setCrmActionId(owner.center_id);
    try {
      await desktopAdminAPI.deactivateCrmOwner(owner.center_id);
      await loadCrmOwners();
    } catch (error: any) {
      showToast.error(handleApiError(error));
    } finally {
      setCrmActionId(null);
    }
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

  const deleteUser = async (user: DesktopUser) => {
    const confirmed = window.confirm(`Delete ${user.username}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setActionId(user.desktop_user_id);
    try {
      await desktopAdminAPI.deleteUser(user.desktop_user_id);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.desktop_user_id !== user.desktop_user_id)
      );
      showToast.success('Desktop app user deleted');
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
              <h1 className="text-2xl font-bold tracking-normal">CRM Admin</h1>
              <p className="text-sm text-zinc-400">Owner and subscription control panel</p>
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
              <div className="relative">
                <Input
                  id="desktop-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-zinc-700 bg-zinc-950 pr-10 text-white"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              CRM Admin
            </div>
            <h1 className="text-3xl font-bold tracking-normal">Owner Subscriptions</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refreshAdminData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">CRM owners</p>
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
            <p className="text-sm text-zinc-500">Students</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">{stats.totalStudents}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Expiring soon</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.expiringSoon}</p>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold">Create CRM owner</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">New owners get a configurable subscription period and student limit.</p>
          </div>

          <form onSubmit={createCrmOwner} className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-center-name">Center name</label>
              <Input
                id="owner-center-name"
                required
                value={ownerForm.center_name}
                onChange={(event) => setOwnerForm((form) => ({ ...form, center_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-center-code">Center code</label>
              <Input
                id="owner-center-code"
                required
                value={ownerForm.center_code}
                onChange={(event) => setOwnerForm((form) => ({ ...form, center_code: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-username">Owner username</label>
              <Input
                id="owner-username"
                required
                value={ownerForm.owner_username}
                onChange={(event) => setOwnerForm((form) => ({ ...form, owner_username: event.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-password">Owner password</label>
              <Input
                id="owner-password"
                required
                type="password"
                value={ownerForm.owner_password}
                onChange={(event) => setOwnerForm((form) => ({ ...form, owner_password: event.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-first-name">Owner first name</label>
              <Input
                id="owner-first-name"
                value={ownerForm.owner_first_name}
                onChange={(event) => setOwnerForm((form) => ({ ...form, owner_first_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-last-name">Owner last name</label>
              <Input
                id="owner-last-name"
                value={ownerForm.owner_last_name}
                onChange={(event) => setOwnerForm((form) => ({ ...form, owner_last_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="owner-email">Owner email</label>
              <Input
                id="owner-email"
                type="email"
                value={ownerForm.owner_email}
                onChange={(event) => setOwnerForm((form) => ({ ...form, owner_email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="center-email">Center email</label>
              <Input
                id="center-email"
                type="email"
                value={ownerForm.center_email}
                onChange={(event) => setOwnerForm((form) => ({ ...form, center_email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="center-phone">Center phone</label>
              <Input
                id="center-phone"
                value={ownerForm.center_phone}
                onChange={(event) => setOwnerForm((form) => ({ ...form, center_phone: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="center-city">City</label>
              <Input
                id="center-city"
                value={ownerForm.city}
                onChange={(event) => setOwnerForm((form) => ({ ...form, city: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="subscription-days">Days</label>
              <Input
                id="subscription-days"
                type="number"
                min={1}
                value={ownerForm.subscription_days}
                onChange={(event) => setOwnerForm((form) => ({ ...form, subscription_days: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700" htmlFor="student-limit">Student limit</label>
              <Input
                id="student-limit"
                type="number"
                min={0}
                placeholder="Unlimited"
                value={ownerForm.student_limit}
                onChange={(event) => setOwnerForm((form) => ({ ...form, student_limit: event.target.value }))}
              />
            </div>
            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={ownerForm.activate_now}
                  onChange={(event) => setOwnerForm((form) => ({ ...form, activate_now: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Activate subscription now
              </label>
              <Button type="submit" disabled={createOwnerLoading} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
                {createOwnerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create Owner
              </Button>
            </div>
          </form>
        </section>

        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">CRM owners</h2>
              <p className="text-sm text-zinc-500">Activate, renew, deactivate, and set student limits for each center.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={ownerQuery}
                onChange={(event) => setOwnerQuery(event.target.value)}
                placeholder="Search owners"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Center</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Students</th>
                  <th className="px-4 py-3 font-semibold">Renew settings</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading CRM owners...
                    </td>
                  </tr>
                ) : filteredCrmOwners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      No CRM owners found.
                    </td>
                  </tr>
                ) : (
                  filteredCrmOwners.map((owner) => {
                    const isActive = owner.subscription_status === 'active';
                    const settings = ownerSettings[owner.center_id] || {
                      subscription_days: String(owner.subscription_days || 30),
                      student_limit: owner.student_limit === null ? '' : String(owner.student_limit),
                    };
                    const progressBase = owner.subscription_days || 30;
                    return (
                      <tr key={owner.center_id} className="align-top hover:bg-zinc-50">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-4 w-4 text-zinc-400" />
                            <div>
                              <div className="font-semibold text-zinc-950">{owner.center_name}</div>
                              <div className="text-xs text-zinc-500">{owner.center_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">{owner.owner_username || 'No owner user'}</div>
                          <div className="text-xs text-zinc-500">{owner.owner_email || owner.center_email || 'No email'}</div>
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
                            {owner.subscription_status}
                          </Badge>
                          <div className="mt-2 flex items-center gap-2 text-zinc-600">
                            <Clock className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium">{owner.subscription_days_remaining}</span>
                            <span>days left</span>
                          </div>
                          <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, (owner.subscription_days_remaining / progressBase) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">{owner.student_count}</div>
                          <div className="text-xs text-zinc-500">
                            limit {owner.student_limit === null ? 'unlimited' : owner.student_limit}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="grid w-56 grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={settings.subscription_days}
                              onChange={(event) => updateOwnerSetting(owner.center_id, 'subscription_days', event.target.value)}
                              aria-label="Subscription days"
                            />
                            <Input
                              type="number"
                              min={0}
                              placeholder="Limit"
                              value={settings.student_limit}
                              onChange={(event) => updateOwnerSetting(owner.center_id, 'student_limit', event.target.value)}
                              aria-label="Student limit"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-zinc-600">
                          <div>{formatDate(owner.subscription_activated_at)}</div>
                          <div className="mt-1 text-xs text-zinc-500">Expires {formatDate(owner.subscription_expires_at)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => activateCrmOwner(owner)}
                              disabled={crmActionId === owner.center_id}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {crmActionId === owner.center_id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
                              )}
                              Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveCrmOwnerSettings(owner)}
                              disabled={crmActionId === owner.center_id}
                            >
                              <Save className="mr-1 h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateCrmOwner(owner)}
                              disabled={crmActionId === owner.center_id || !isActive}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
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
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(user)}
                              disabled={actionId === user.desktop_user_id}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
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
