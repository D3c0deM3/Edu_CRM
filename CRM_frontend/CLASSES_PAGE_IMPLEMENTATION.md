# Classes Page Implementation Guide

## Overview

The ClassesPage has been completely redesigned with a modern Material-UI interface featuring:

1. **Card-Based Class View** - Classes displayed as beautiful cards with hover effects
2. **Detailed Class Modal** - 4-tab interface for comprehensive class management
3. **Schedule Management** - Select multiple days + time stored as JSON string
4. **Calendar View** - Visual representation of class schedule with Microsoft Teams-like UI
5. **Attendance Tracking** - Mark attendance for all students in a class with one-click submission

## Files Created/Modified

### 1. ClassesPage.tsx
**Main page component** - Card-based grid layout for displaying classes

**Key Features:**
- Grid layout with responsive columns (xs: 1, sm: 2, md: 3)
- Add/Edit dialog with schedule configuration
- Schedule stored as JSON: `{ days: ['Monday', 'Wednesday', 'Friday'], time: '10:00' }`
- Days selection using Material-UI Checkboxes
- Time selection using HTML5 time input
- Card actions for Details, Edit, and Delete

**Main Elements:**
- `ClassCard` - Displays class information with hover animation
- `Add Class Dialog` - Form with schedule configuration section
- `selectedDays[]` - Array to track selected weekdays
- `scheduleTime` - String in HH:MM format

### 2. ClassDetailModal.tsx
**Detailed class information component** - Opened from Details button on card

**4 Tabs:**

#### Tab 1: Class Info
- Basic class data in grid layout
- Displays: code, level, section, capacity, room, payment info
- **Schedule Section** - Shows parsed schedule (days + time)

#### Tab 2: Students
- Loads all students and filters by class_id
- Table showing: Enrollment #, Name
- Empty state handling

#### Tab 3: Attendance
- Mark attendance for today
- Checkbox for each student (Present/Absent)
- **Mark Attendance button** - Submits attendance records via API
- Uses `attendanceAPI.create()` or `attendanceAPI.update()`
- Payload: `{ student_id, class_id, teacher_id, attendance_date, status, remarks }`

#### Tab 4: Calendar
- Renders `ClassCalendar` component
- Visual monthly calendar
- Highlights class days
- Shows lesson time on class days

**Attendance Logic:**
```typescript
// When marking attendance
const today = new Date().toISOString().split('T')[0];
for (const [studentId, isPresent] of attendance) {
  const attendanceData = {
    student_id: studentId,
    class_id: classId,
    teacher_id: classData?.teacher_id || 1,
    attendance_date: today,
    status: isPresent ? 'Present' : 'Absent',
    remarks: 'Marked in class detail',
  };
  // Create or update existing record
}
```

### 3. ClassCalendar.tsx
**Calendar component** - Microsoft Teams-style class schedule calendar

**Features:**
- Monthly calendar grid with 7-day layout
- Class days highlighted in primary color (emerald green)
- Lesson time displayed on class days
- Today highlighted with secondary color border
- Responsive grid layout
- Visual legend showing class days and today

**Calendar Data:**
- Generates full month view with previous/next month days
- Checks each day against schedule.days array
- Displays time formatted from schedule.time

## Data Structure

### Schedule Object (Stored as JSON string)
```typescript
interface Schedule {
  days: string[];        // ['Monday', 'Wednesday', 'Friday']
  time: string;         // '10:00' (24-hour format)
}

// Stored in database as:
// schedule: JSON.stringify(schedule)
// "{"days":["Monday","Wednesday","Friday"],"time":"10:00"}"
```

### Attendance Record
```typescript
interface Attendance {
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;  // 'YYYY-MM-DD'
  status: string;           // 'Present' or 'Absent'
  remarks?: string;
}
```

## API Integration

### APIs Used

1. **classAPI.getAll()** - Fetch all classes
2. **classAPI.create(data)** - Create new class with schedule
3. **classAPI.update(id, data)** - Update class including schedule
4. **classAPI.delete(id)** - Delete class
5. **studentAPI.getAll()** - Get all students (filtered by class_id)
6. **attendanceAPI.create(data)** - Create attendance record
7. **attendanceAPI.update(id, data)** - Update attendance
8. **attendanceAPI.getByClass(classId)** - Get attendance for class (for today)

### Schedule Format in API

When creating/updating a class:
```typescript
const classData = {
  class_name: 'Class 10-A',
  class_code: 'CLASS10A',
  // ... other fields
  schedule: JSON.stringify({
    days: ['Monday', 'Wednesday', 'Friday'],
    time: '10:00'
  })
};
```

## UI Components Used

### Material-UI Components
- `Card` - Class information cards
- `Grid` - Responsive card grid layout
- `Dialog` - Modal for class details
- `Tabs` - 4-tab interface for class details
- `Table` - Student and attendance lists
- `Checkbox` - Attendance marking
- `TextField` - Form inputs
- `FormControl` - Select dropdowns
- `FormGroup` - Day selection checkboxes
- `Stack` - Vertical/horizontal spacing
- `Box` - Layout container
- `Button` - Actions
- `Typography` - Text elements
- `Alert` - Status messages
- `CircularProgress` - Loading states
- `Chip` - Day tags in schedule
- `Paper` - Table container

## Styling

### Color Scheme
- **Primary (Emerald Green #10b981)** - Class day highlights, main buttons
- **Secondary (Purple #8b5cf6)** - Today indicator
- **Background** - Light gray for schedule section

### Responsive Breakpoints
- **xs (320px)**: 1 card per row
- **sm (600px)**: 2 cards per row
- **md (900px)**: 3 cards per row

### Hover Effects
- Card: `translateY(-8px)` with shadow elevation
- Buttons: Theme color transitions

## Usage Flow

### Creating a Class with Schedule

1. Click **Add Class** button
2. Fill in class details:
   - Class Name, Code, Level, Section
   - Capacity, Room Number
   - Payment Amount & Frequency
   - Center & Teacher selection
3. **Schedule Section:**
   - Check desired days (Monday, Tuesday, etc.)
   - Select time using time picker
4. Click **Save**
5. Schedule stored as JSON in database

### Viewing Class Details

1. Click **Details** on class card
2. **Class Info tab**: View all class data + schedule
3. **Students tab**: See enrolled students
4. **Attendance tab**: Mark attendance
   - Checkboxes appear for each student
   - Click to toggle Present/Absent
   - Click **Mark Attendance** to submit
5. **Calendar tab**: View visual schedule with lesson times

### Marking Attendance

1. Open class details → **Attendance tab**
2. Alert shows today's date
3. For each student:
   - Check checkbox = Present
   - Uncheck = Absent
4. Click **Mark Attendance**
5. Records created in database
6. Success toast notification

## State Management

### ClassesPage State
```typescript
const [state, actions] = useCRUD<Class>(classAPI, 'Class');
const [selectedDays, setSelectedDays] = useState<string[]>([]);
const [scheduleTime, setScheduleTime] = useState('09:00');
const [selectedClass, setSelectedClass] = useState<Class | null>(null);
const [detailModalOpen, setDetailModalOpen] = useState(boolean);
```

### ClassDetailModal State
```typescript
const [tabValue, setTabValue] = useState(0);
const [students, setStudents] = useState<Student[]>([]);
const [attendance, setAttendance] = useState<Map<number, boolean>>(new Map());
const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
```

## Error Handling

- **Loading states**: CircularProgress during API calls
- **Empty states**: Alert messages when no data
- **Error toasts**: showToast.error() for failed operations
- **Success toasts**: showToast.success() after operations
- **Confirmation dialogs**: Delete operations require confirmation

## Performance Considerations

1. **Lazy loading**: Students loaded only when tab opened
2. **API efficiency**: Get attendance by class (not full list)
3. **Date filtering**: Today's attendance filtered on client
4. **Memoization**: useCallback could be added for event handlers
5. **Pagination**: Consider for large class lists

## Future Enhancements

1. **Bulk Attendance**: Select multiple classes for attendance
2. **Attendance Reports**: Download attendance reports
3. **Class Durations**: Add end time to schedule
4. **Multiple Sessions**: Support morning/afternoon sessions
5. **Vacation Periods**: Mark days when class doesn't meet
6. **Notifications**: Notify teacher of attendance submission
7. **Analytics**: Attendance statistics per student

## Testing Checklist

- [ ] Create class with schedule
- [ ] Edit class and modify schedule days/time
- [ ] Delete class
- [ ] View class details with all tabs
- [ ] View students in class
- [ ] Mark attendance and verify API submission
- [ ] View calendar with correct schedule highlighted
- [ ] Responsive design on mobile
- [ ] Error handling (delete, API failures)
- [ ] Toast notifications appear

## API Response Examples

### Schedule in Class Response
```json
{
  "class_id": 1,
  "class_name": "Class 10-A",
  "class_code": "CLASS10A",
  "schedule": "{\"days\":[\"Monday\",\"Wednesday\",\"Friday\"],\"time\":\"10:00\"}"
}
```

### Attendance Submission
```json
POST /api/attendance
{
  "student_id": 1,
  "class_id": 1,
  "teacher_id": 1,
  "attendance_date": "2024-01-22",
  "status": "Present",
  "remarks": "Marked in class detail"
}
```

### Attendance Get by Class
```json
GET /api/attendance/class/1

[
  {
    "attendance_id": 1,
    "student_id": 1,
    "class_id": 1,
    "attendance_date": "2024-01-22",
    "status": "Present"
  },
  {
    "attendance_id": 2,
    "student_id": 2,
    "class_id": 1,
    "attendance_date": "2024-01-22",
    "status": "Absent"
  }
]
```
