# PowerShell script to import all SQL files into crm_db

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbUser = "root"
$dbName = "crm_db"

# List of SQL files in order
$sqlFiles = @(
    "edu_center.sql",
    "subjects.sql",
    "class.sql",
    "teachers.sql",
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
