import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Schedule {
  days: string[];
  time: string;
}

interface ClassCalendarProps {
  schedule: Schedule;
}

const ClassCalendar: React.FC<ClassCalendarProps> = ({ schedule }) => {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get first day of month
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create array of days to display
  const calendarDays: Array<{ date: number; isCurrentMonth: boolean; dayName: string }> = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = daysInPrevMonth - i;
    const dayIndex = (firstDay - 1 - i) % 7;
    calendarDays.push({
      date,
      isCurrentMonth: false,
      dayName: weekDays[dayIndex],
    });
  }

  // Current month days
  for (let date = 1; date <= daysInMonth; date++) {
    const dayIndex = (calendarDays.length) % 7;
    calendarDays.push({
      date,
      isCurrentMonth: true,
      dayName: weekDays[dayIndex],
    });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length;
  for (let date = 1; date <= remainingDays; date++) {
    const dayIndex = (calendarDays.length) % 7;
    calendarDays.push({
      date,
      isCurrentMonth: false,
      dayName: weekDays[dayIndex],
    });
  }

  // Create weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-6">
      {/* Schedule Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <h3 className="font-bold text-base">Class Schedule</h3>
          {schedule.days && schedule.days.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {schedule.days.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{schedule.time}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No schedule configured</p>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Month Header */}
          <h2 className="text-lg font-bold mb-4 text-center text-primary">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-1 text-center font-bold bg-primary text-primary-foreground rounded"
              >
                <span className="text-xs">{day.substring(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((day, dayIndex) => {
                const isClassDay = schedule.days && schedule.days.includes(day.dayName);
                const isToday =
                  day.isCurrentMonth &&
                  day.date === today.getDate() &&
                  today.getMonth() === currentMonth &&
                  today.getFullYear() === currentYear;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'p-2 min-h-[80px] rounded flex flex-col justify-start items-center cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                      isClassDay
                        ? 'bg-primary text-primary-foreground'
                        : day.isCurrentMonth
                        ? 'bg-muted'
                        : 'bg-muted/40',
                      isToday ? 'ring-3 ring-secondary' : 'border border-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold mb-0.5',
                        isClassDay
                          ? 'text-primary-foreground'
                          : day.isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {day.date}
                    </span>
                    {isClassDay && (
                      <div className="w-full flex flex-col items-center gap-0.5">
                        <div className="w-full h-0.5 bg-primary-foreground rounded" />
                        <span className="text-[0.65rem] font-semibold text-primary-foreground text-center">
                          {schedule.time}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span className="text-xs">Class Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-3 border-secondary bg-white" />
          <span className="text-xs">Today</span>
        </div>
      </div>
    </div>
  );
};

export default ClassCalendar;
