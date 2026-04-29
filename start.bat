@echo off
title Next.js Project Starter

cd /d "%~dp0"

echo ==============================
echo Next.js Project Starter
echo ==============================
echo Current directory: %CD%
echo.

if not exist package.json (
    echo package.json was not found in the current directory.
    echo Please double-click the start.bat inside the project root folder.
    echo start.bat must be in the same folder as package.json.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js was not found. Please install Node.js first.
    pause
    exit /b 1
)

if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

set PM=npm

if exist pnpm-lock.yaml (
    where pnpm >nul 2>nul
    if %errorlevel%==0 set PM=pnpm
)

if exist yarn.lock (
    where yarn >nul 2>nul
    if %errorlevel%==0 set PM=yarn
)

echo Package manager: %PM%

if not exist node_modules (
    echo node_modules was not found. Installing dependencies...

    if "%PM%"=="pnpm" (
        pnpm install
    ) else if "%PM%"=="yarn" (
        yarn install
    ) else (
        npm.cmd install
    )

    if %errorlevel% neq 0 (
        echo Dependency installation failed.
        pause
        exit /b 1
    )
)

set PORT=3000

netstat -ano | findstr ":%PORT%" >nul
if %errorlevel%==0 (
    echo Port %PORT% is already in use.
    echo Opening the existing dev server: http://localhost:%PORT%
    start http://localhost:%PORT%
    echo.
    echo If this is not your project, close the process using port %PORT% and run this file again.
    pause
    exit /b 0
)

echo Available port: %PORT%
echo Starting project...
echo Browser will open: http://localhost:%PORT%
echo.

start http://localhost:%PORT%

if "%PM%"=="pnpm" (
    pnpm dev --port %PORT%
) else if "%PM%"=="yarn" (
    yarn dev --port %PORT%
) else (
    npm.cmd run dev -- -p %PORT%
)

echo.
echo Project stopped.
pause
