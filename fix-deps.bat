@echo off
echo Fixing Vite module resolution error...
echo.

if not exist package.json (
    echo Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

echo Step 1: Removing node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo Step 2: Clearing npm cache...
call npm cache clean --force

echo Step 3: Installing dependencies...
call npm install

echo.
echo Dependencies reinstalled successfully!
echo.
echo You can now run 'npm run dev' to start the development server.
