# Classes Page - Feature Quick Reference

## 🎯 Key Features

### 1. Card-Based Class Grid
- Beautiful Material Design cards with hover animations
- Shows class name, code, level, section, capacity, room, and payment info
- Responsive grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

### 2. Schedule Management (NEW)
When creating/editing a class:
- **Days Selection**: Checkboxes for each weekday (Monday-Sunday)
- **Time Selection**: HTML5 time picker
- **Storage**: Automatically converted to JSON: `{"days": ["Mon", "Wed", "Fri"], "time": "10:00"}`
- **Backend**: Stored as string in `schedule` column

### 3. Class Details Modal (4 Tabs)

#### Tab 1: Class Info ✓
- View all class data
- **Highlighted Schedule Section** showing selected days and time

#### Tab 2: Students ✓
- List of all students enrolled in the class
- Table with enrollment #, name
- Auto-loaded and filtered by class_id

#### Tab 3: Attendance ✓
- **Mark attendance for today**
- Checkbox for each student (✓ = Present, ☐ = Absent)
- **Mark Attendance button** submits all at once
- Uses `attendanceAPI.create()` for new records
- Uses `attendanceAPI.update()` for existing records
- Shows today's date for reference

#### Tab 4: Calendar ✓
- **Visual monthly calendar** (like Microsoft Teams)
- Class days highlighted in primary color
- Shows lesson time on class days
- Today highlighted with secondary color border
- Perfect for scheduling visualization

### 4. Attendance Tracking System

**How It Works:**
1. Open class → click "Details" → go to "Attendance" tab
2. See all students with checkboxes
3. Check/uncheck to mark Present/Absent
4. Click "Mark Attendance" to submit
5. Creates/updates attendance records in database

**Data Sent to Backend:**
```javascript
{
  student_id: 5,
  class_id: 1,
  teacher_id: 1,
  attendance_date: "2024-01-22",  // Today's date
  status: "Present",               // or "Absent"
  remarks: "Marked in class detail"
}
```

**Smart Logic:**
- Automatically checks for existing today's attendance
- Updates if exists, creates if new
- Prevents duplicate entries

## 🚀 How to Use

### Create a Class with Schedule
1. Click **Add Class** button
2. Fill in:
   - Class Name (e.g., "Class 10-A")
   - Class Code (e.g., "CLASS10A")
   - Level, Section, Capacity, Room Number
   - Payment Amount & Frequency
   - Center & Teacher (optional)
3. **Schedule Section:**
   - Check the days class meets (e.g., Monday, Wednesday, Friday)
   - Select time (e.g., 10:00)
4. Click **Save**

### Edit Class Schedule
1. Click **Edit** on class card
2. Modify details OR adjust schedule days/time
3. Change checkboxes as needed
4. Click **Save**

### View Class Calendar
1. Click **Details** on class card
2. Go to **Calendar** tab
3. See visual representation:
   - Emerald highlighted days = Class days
   - Blue border = Today
   - Time shown on class days

### Mark Attendance
1. Click **Details** on class card
2. Go to **Attendance** tab
3. See list of students with checkboxes
4. Check boxes = Present, Uncheck = Absent
5. Click **Mark Attendance**
6. Green toast: "Attendance marked successfully!"

## 📊 Example Schedule JSON

What gets stored in database:
```json
{
  "schedule": "{\"days\":[\"Monday\",\"Wednesday\",\"Friday\"],\"time\":\"10:00\"}"
}
```

When loaded in app:
```javascript
const schedule = {
  days: ["Monday", "Wednesday", "Friday"],
  time: "10:00"
};
```

## 🎨 UI Features

### Cards
- Hover: Lift up with shadow (translateY -8px)
- Header: Primary color background with class name
- Content: Grid layout of class info
- Actions: Details, Edit, Delete buttons

### Calendar
- Full month view
- 7-column grid (Mon-Sun)
- Class day cells: Emerald background, white text, lesson time
- Regular day cells: Default background
- Today: Blue border
- Responsive: Scrollable on small screens

### Attendance
- Alert: Today's date banner
- Table: Student names + checkboxes
- All-or-nothing checkboxes: One action marks all
- Submit button: Disabled until changes made

## 🔄 API Endpoints Used

```
GET  /api/classes                    - Get all classes
POST /api/classes                    - Create class with schedule
PUT  /api/classes/:id                - Update class
DELETE /api/classes/:id              - Delete class

GET  /api/students                   - Get students (filtered for class)
GET  /api/attendance/class/:classId  - Get attendance for class
POST /api/attendance                 - Mark attendance
PUT  /api/attendance/:id             - Update attendance
```

## 💾 Backend Integration Checklist

- [x] Class creation accepts `schedule` string
- [x] Class update preserves `schedule`
- [x] Attendance API creates records properly
- [x] Attendance API updates existing records
- [x] getByClass() endpoint returns today's records
- [x] Error handling with try-catch
- [x] Toast notifications for success/error

## 📱 Responsive Design

| Screen Size | Grid Columns | Description |
|---|---|---|
| Mobile (320px) | 1 | Single column, full width |
| Tablet (600px) | 2 | Two columns side by side |
| Desktop (900px) | 3+ | Three or more columns |
| Calendar | Responsive | Scrollable on small screens |

## 🎯 Color Coding

- **Primary (Emerald #10b981)**: Class days, main buttons, active states
- **Secondary (Purple #8b5cf6)**: Today indicator, accent highlights
- **Success (Green)**: Toast notifications
- **Error (Red)**: Delete operations, error states

## ⚡ Performance Notes

- Students loaded only when tab opened
- Attendance only fetches for current class
- Today's attendance filtered on client side
- No unnecessary re-renders with proper state management

## 🔐 Permissions & Data

- Teachers can view their own classes
- Can mark attendance for their classes
- Can see students enrolled
- Calendar visible to all authorized users
