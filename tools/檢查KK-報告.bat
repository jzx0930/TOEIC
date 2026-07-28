@echo off
setlocal
pushd "%~dp0"
echo ============================================
echo    TOEIC - Check KK (report only)
echo ============================================
echo.

REM --- 1. Node.js check ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Please install the LTS version from https://nodejs.org/ then run again.
  pause & popd & exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Using Node %%v

REM --- 2. Ensure package.json exists (needed by npm install) ---
if not exist "package.json" (
  echo Creating package.json ...
  call npm init -y >nul 2>nul
)

REM --- 3. Install deps only if missing ---
node -e "require.resolve('cmu-pronouncing-dictionary');require.resolve('hyphen')" 1>nul 2>nul
if errorlevel 1 (
  echo Installing dependencies ^(first run only^) ...
  call npm install cmu-pronouncing-dictionary hyphen
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your network and try again.
    pause & popd & exit /b 1
  )
) else (
  echo Packages OK.
)

REM --- 4. Run the checker (report only) ---
echo.
echo Running check ...
echo.
node "%~dp0tools\check-kk.mjs"

echo.
echo Done. Review the report above.
pause
popd
endlocal
