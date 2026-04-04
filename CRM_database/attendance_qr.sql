CREATE TABLE IF NOT EXISTS attendance_qr_sessions (
    session_id SERIAL PRIMARY KEY,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    center_id INT NOT NULL REFERENCES edu_centers(center_id),
    teacher_id INT NOT NULL REFERENCES teachers(teacher_id),
    class_id INT NOT NULL REFERENCES classes(class_id),
    attendance_date DATE NOT NULL,
    room_number_snapshot VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    location_required BOOLEAN NOT NULL DEFAULT FALSE,
    location_latitude NUMERIC(10, 7),
    location_longitude NUMERIC(10, 7),
    location_accuracy_meters NUMERIC(8, 2),
    location_radius_meters NUMERIC(8, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_qr_checkins (
    qr_checkin_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES attendance_qr_sessions(session_id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    attendance_id INT REFERENCES attendance(attendance_id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy_meters NUMERIC(8, 2),
    distance_meters NUMERIC(8, 2),
    location_validated BOOLEAN NOT NULL DEFAULT FALSE,
    device_info TEXT,
    UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_qr_sessions_class_date
ON attendance_qr_sessions(class_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_qr_sessions_expires_at
ON attendance_qr_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_attendance_qr_checkins_session
ON attendance_qr_checkins(session_id, checked_in_at DESC);
