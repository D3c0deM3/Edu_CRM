import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  useTheme,
} from '@mui/material';
import { Event as EventIcon } from '@mui/icons-material';

interface Schedule {
  days: string[];
  time: string;
}

interface ClassCalendarProps {
  schedule: Schedule;
}

const ClassCalendar: React.FC<ClassCalendarProps> = ({ schedule }) => {
  const theme = useTheme();
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

  const isClassDay = (dayName: string) => {
    return schedule.days && schedule.days.includes(dayName);
  };

  // Create weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <Stack spacing={3}>
      {/* Schedule Summary */}
      <Paper sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Class Schedule
          </Typography>
          {schedule.days && schedule.days.length > 0 ? (
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {schedule.days.map((day) => (
                  <Chip
                    key={day}
                    label={day}
                    color="primary"
                    variant="outlined"
                    sx={{
                      backgroundColor: theme.palette.primary.light,
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {schedule.time}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No schedule configured
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Calendar Grid */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: '100%' }}>
          {/* Month Header */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
              textAlign: 'center',
              color: theme.palette.primary.main,
            }}
          >
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Typography>

          {/* Weekday Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 1,
              mb: 1,
            }}
          >
            {weekDays.map((day) => (
              <Box
                key={day}
                sx={{
                  p: 1,
                  textAlign: 'center',
                  fontWeight: 700,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">{day.substring(0, 3)}</Typography>
              </Box>
            ))}
          </Box>

          {/* Calendar Days */}
          {weeks.map((week, weekIndex) => (
            <Box
              key={weekIndex}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1,
                mb: 1,
              }}
            >
              {week.map((day, dayIndex) => {
                const isClassDay = schedule.days && schedule.days.includes(day.dayName);
                const isToday =
                  day.isCurrentMonth &&
                  day.date === today.getDate() &&
                  today.getMonth() === currentMonth &&
                  today.getFullYear() === currentYear;

                return (
                  <Box
                    key={dayIndex}
                    sx={{
                      p: 2,
                      minHeight: 80,
                      borderRadius: 1,
                      backgroundColor: isClassDay
                        ? theme.palette.primary.light
                        : day.isCurrentMonth
                        ? theme.palette.background.default
                        : theme.palette.action.disabledBackground,
                      border: isToday ? `3px solid ${theme.palette.secondary.main}` : '1px solid #e0e0e0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: isClassDay ? 'white' : day.isCurrentMonth ? 'inherit' : 'text.disabled',
                        mb: 0.5,
                      }}
                    >
                      {day.date}
                    </Typography>
                    {isClassDay && (
                      <Stack spacing={0.5} sx={{ width: '100%', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: '2px',
                            backgroundColor: 'white',
                            borderRadius: 1,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            textAlign: 'center',
                          }}
                        >
                          {schedule.time}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: 1,
              backgroundColor: theme.palette.primary.light,
            }}
          />
          <Typography variant="caption">Class Day</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: 1,
              border: `3px solid ${theme.palette.secondary.main}`,
              backgroundColor: 'white',
            }}
          />
          <Typography variant="caption">Today</Typography>
        </Box>
      </Box>
    </Stack>
  );
};

export default ClassCalendar;
