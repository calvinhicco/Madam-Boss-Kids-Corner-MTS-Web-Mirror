-- Supabase Database Schema for My Students Web Mirror
-- Run this in your Supabase SQL Editor

-- Note: Skip the JWT secret setting - Supabase handles this automatically

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL CHECK (role IN ('Teacher', 'Admin', 'Security', 'Support Staff', 'Driver')),
    contact VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_joined DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deleted_staff table (for soft deletes)
CREATE TABLE IF NOT EXISTS deleted_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_staff_id UUID,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_joined DATE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_reason TEXT
);

-- Create staff_logs table
CREATE TABLE IF NOT EXISTS staff_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_in TIME,
    time_out TIME,
    duties TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    is_present BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date) -- One log per staff per day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_logs_date ON staff_logs(date);
CREATE INDEX IF NOT EXISTS idx_staff_logs_staff_id ON staff_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_logs_date_staff ON staff_logs(date, staff_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_logs_updated_at BEFORE UPDATE ON staff_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for read-only access (adjust as needed for your auth setup)
-- For now, allowing all reads - you can restrict this later
CREATE POLICY "Allow read access to staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Allow read access to deleted_staff" ON deleted_staff FOR SELECT USING (true);
CREATE POLICY "Allow read access to staff_logs" ON staff_logs FOR SELECT USING (true);

-- Insert sample data
INSERT INTO staff (name, role, contact, email, date_joined) VALUES
    ('John Doe', 'Teacher', '0771234567', 'john.doe@school.com', '2024-01-15'),
    ('Jane Smith', 'Admin', '0772345678', 'jane.smith@school.com', '2024-02-01'),
    ('Mike Johnson', 'Security', '0773456789', NULL, '2024-03-01'),
    ('Sarah Wilson', 'Teacher', '0774567890', 'sarah.wilson@school.com', '2024-01-20'),
    ('David Brown', 'Driver', '0775678901', NULL, '2024-02-15');

-- Insert sample staff logs for today
INSERT INTO staff_logs (staff_id, staff_name, role, date, time_in, time_out, duties, notes, is_present)
SELECT 
    s.id,
    s.name,
    s.role,
    CURRENT_DATE,
    CASE 
        WHEN s.role = 'Admin' THEN '07:30'::time
        WHEN s.role = 'Security' THEN '06:00'::time
        WHEN s.role = 'Driver' THEN '07:00'::time
        ELSE '08:00'::time
    END,
    CASE 
        WHEN s.role = 'Admin' THEN '17:00'::time
        WHEN s.role = 'Security' THEN '18:00'::time
        WHEN s.role = 'Driver' THEN '16:00'::time
        ELSE '16:00'::time
    END,
    CASE 
        WHEN s.role = 'Teacher' THEN 'Teaching duties, lesson planning'
        WHEN s.role = 'Admin' THEN 'Administrative tasks, parent meetings'
        WHEN s.role = 'Security' THEN 'School security, gate monitoring'
        WHEN s.role = 'Driver' THEN 'Student transportation'
        ELSE 'General duties'
    END,
    'Regular duties completed',
    true
FROM staff s
WHERE s.is_active = true
LIMIT 3; -- Only add logs for first 3 staff members

-- Create a view for easy querying
CREATE OR REPLACE VIEW staff_attendance_summary AS
SELECT 
    sl.date,
    sl.role,
    COUNT(*) as total_present,
    COUNT(CASE WHEN sl.time_in > '08:30' THEN 1 END) as late_arrivals,
    AVG(EXTRACT(EPOCH FROM (sl.time_out::time - sl.time_in::time))/3600) as avg_hours_worked
FROM staff_logs sl
WHERE sl.is_present = true
GROUP BY sl.date, sl.role
ORDER BY sl.date DESC, sl.role;
