import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { classAPI, centerAPI } from '../../shared/api/api';
import { useAppSelector } from '../../features/crm/hooks';
import type { RootState } from '../../store';
import { showToast } from '../../utils/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ScheduledClass {
  class_id: number;
  class_name: string;
  class_code?: string;
  teacher_id?: number | null;
  room_number?: string | null;
  section?: string | null;
}

interface ReminderItem {
  reminderKey: string;
  class_id: number;
  class_name: string;
  class_code?: string;
  room_number?: string | null;
  startsAt: Date;
  minutesUntil: number;
  displayTime: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REMINDER_STORAGE_KEY = 'teacher-class-reminders-fired';
const DEFAULT_WARNING_MINUTES = 15;

const parseSchedule = (rawSection: string | null | undefined): { days: string[]; time: string } | null => {
  if (!rawSection) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSection);
    if (!Array.isArray(parsed.days) || typeof parsed.time !== 'string') {
      return null;
    }

    return {
      days: parsed.days,
      time: parsed.time,
    };
  } catch {
    return null;
  }
};

const loadFiredReminderKeys = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.sessionStorage.getItem(REMINDER_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistFiredReminderKeys = (keys: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(keys));
};

const TeacherReminderWatcher = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [warningMinutes, setWarningMinutes] = useState(DEFAULT_WARNING_MINUTES);
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [dueSoonClasses, setDueSoonClasses] = useState<ReminderItem[]>([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const firedRemindersRef = useRef<Set<string>>(new Set(loadFiredReminderKeys()));

  useEffect(() => {
    if (user?.userType !== 'teacher' || !user.center_id) {
      setDueSoonClasses([]);
      return;
    }

    let cancelled = false;

    const loadReminderConfig = async () => {
      try {
        const [centerResponse, classResponse] = await Promise.all([
          centerAPI.getById(user.center_id),
          classAPI.getAll(),
        ]);

        if (cancelled) {
          return;
        }

        const center = centerResponse.data || {};
        const allClasses = Array.isArray(classResponse.data) ? classResponse.data : [];
        setWarningMinutes(
          Number.isFinite(Number(center.teacher_class_warning_minutes))
            ? Number(center.teacher_class_warning_minutes)
            : DEFAULT_WARNING_MINUTES
        );
        setClasses(
          allClasses.filter((classItem: ScheduledClass) => Number(classItem.teacher_id) === Number(user.id))
        );
      } catch (error) {
        console.error('Failed to load teacher class reminder data:', error);
      }
    };

    void loadReminderConfig();

    return () => {
      cancelled = true;
    };
  }, [user?.center_id, user?.id, user?.userType]);

  const computedDueSoonClasses = useMemo(() => {
    if (user?.userType !== 'teacher') {
      return [];
    }

    const now = currentTime;
    const todayName = DAY_NAMES[now.getDay()];
    const reminderWindowMs = Math.max(warningMinutes, 0) * 60 * 1000;
    const reminders: ReminderItem[] = [];

    classes.forEach((classItem) => {
      const schedule = parseSchedule(classItem.section);
      if (!schedule || !schedule.days.includes(todayName)) {
        return;
      }

      const [hoursText, minutesText] = schedule.time.split(':');
      const hours = Number(hoursText);
      const minutes = Number(minutesText);
      if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return;
      }

      const startsAt = new Date(now);
      startsAt.setHours(hours, minutes, 0, 0);

      const diffMs = startsAt.getTime() - now.getTime();
      if (diffMs < 0 || diffMs > reminderWindowMs) {
        return;
      }

      reminders.push({
        reminderKey: `${classItem.class_id}-${startsAt.toDateString()}-${schedule.time}`,
        class_id: classItem.class_id,
        class_name: classItem.class_name,
        class_code: classItem.class_code,
        room_number: classItem.room_number,
        startsAt,
        minutesUntil: Math.max(Math.ceil(diffMs / 60000), 0),
        displayTime: schedule.time,
      });
    });

    return reminders.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  }, [classes, currentTime, user?.userType, warningMinutes]);

  useEffect(() => {
    if (user?.userType !== 'teacher') {
      return;
    }

    setDueSoonClasses(computedDueSoonClasses);

    let didChange = false;
    computedDueSoonClasses.forEach((reminder) => {
      if (firedRemindersRef.current.has(reminder.reminderKey)) {
        return;
      }

      const timeText =
        reminder.minutesUntil <= 0
          ? `${reminder.class_name} starts now`
          : `${reminder.class_name} starts in ${reminder.minutesUntil} minute${reminder.minutesUntil === 1 ? '' : 's'}`;

      showToast.warning(
        `${timeText}${reminder.room_number ? ` in room ${reminder.room_number}` : ''}.`,
        { autoClose: 5000 }
      );

      firedRemindersRef.current.add(reminder.reminderKey);
      didChange = true;
    });

    if (didChange) {
      persistFiredReminderKeys(Array.from(firedRemindersRef.current));
    }
  }, [computedDueSoonClasses, user?.userType]);

  useEffect(() => {
    if (user?.userType !== 'teacher') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.userType]);

  if (user?.userType !== 'teacher' || dueSoonClasses.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
      <Bell className="h-4 w-4 text-amber-600" />
      <AlertDescription>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Upcoming class reminders</span>
          <Badge variant="outline" className="border-amber-300 bg-white/80 text-amber-700">
            Warning window: {warningMinutes} min
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {dueSoonClasses.map((reminder) => (
            <Badge
              key={reminder.reminderKey}
              variant="outline"
              className="flex items-center gap-1 border-amber-300 bg-white text-amber-700"
            >
              <Clock className="h-3 w-3" />
              {reminder.class_name} at {reminder.displayTime}
              {reminder.minutesUntil > 0 ? ` (${reminder.minutesUntil} min)` : ' (starting now)'}
            </Badge>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default TeacherReminderWatcher;
