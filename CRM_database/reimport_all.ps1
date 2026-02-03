# PowerShell script to reimport all SQL files into crm_db in correct order

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbUser = "root"
$dbName = "crm_db"

# Drop all tables to start fresh (optional - comment out if you want to keep data)
Write-Host "Dropping existing tables..." -ForegroundColor Yellow
$dropQuery = @"
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS finance_management;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS superusers;
DROP TABLE IF EXISTS edu_centers;
"@
$dropQuery | & $mysqlPath -u $dbUser -p $dbName

# List of SQL files in CORRECT order (respecting foreign keys)
$sqlFiles = @(
    "edu_center.sql",
    "subjects.sql",
    "teachers.sql",
    "class.sql",
    "students.sql",
    "grades.sql",
    "attendance.sql",
    "finance_management.sql",
    "payments.sql",
    "assignments.sql",
    "assignment_submissions.sql",
    "superuser.sql",
    "UTILITIES_VIEWS_PROCEDURES.sql"
)

Write-Host "Starting import of SQL files into $dbName..." -ForegroundColor Green

foreach ($file in $sqlFiles) {
    $filePath = Join-Path (Get-Location) $file
    
    if (Test-Path $filePath) {
        Write-Host "Importing $file..." -ForegroundColor Yellow
        Get-Content $filePath | & $mysqlPath -u $dbUser -p $dbName
        Write-Host "✓ $file imported successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "All SQL files imported successfully!" -ForegroundColor Green
