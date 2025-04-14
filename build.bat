@echo off
setlocal enabledelayedexpansion

:: ANSI color codes for Windows PowerShell - will work in Windows 10+ with new terminal
set "RED=[31m"
set "GREEN=[32m"
set "BLUE=[34m"
set "YELLOW=[33m"
set "NC=[0m"

echo !BLUE!================================================!NC!
echo !BLUE!          Data Deck Application Builder         !NC!
echo !BLUE!================================================!NC!

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: Node.js is not installed on your system.!NC!
    echo !YELLOW!Please install Node.js from https://nodejs.org/ (version 16 or higher recommended)!NC!
    echo After installing, restart this script.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=v." %%a in ('node -v') do (
    set "NODE_MAJOR_VERSION=%%b"
)

if !NODE_MAJOR_VERSION! LSS 16 (
    echo !YELLOW!Warning: You're using Node.js version lower than 16. We recommend version 16 or higher.!NC!
    set /p CONTINUE="Do you want to continue anyway? [y/N] "
    if /i "!CONTINUE!" neq "y" (
        echo Exiting. Please upgrade Node.js and try again.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%a in ('node -v') do echo !GREEN!✓ Using Node.js version %%a!NC!
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: npm is not installed on your system.!NC!
    echo !YELLOW!npm should be included with Node.js installation.!NC!
    echo Try reinstalling Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('npm -v') do echo !GREEN!✓ Using npm version %%a!NC!
)

:: Get the script directory
set "SCRIPT_DIR=%~dp0"
set "JS_SCRIPT=%SCRIPT_DIR%scripts\build-app.js"

if not exist "%JS_SCRIPT%" (
    echo !RED!Error: Build script not found at %JS_SCRIPT%!NC!
    pause
    exit /b 1
)

echo !BLUE!Starting build process...!NC!
echo.

:: Execute the JavaScript build script directly
node "%JS_SCRIPT%"

:: Check exit status
if %ERRORLEVEL% equ 0 (
    echo !GREEN!Build process completed successfully!!NC!
) else (
    echo !RED!Build process failed.!NC!
    pause
    exit /b 1
)

pause 