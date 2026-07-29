@echo off
setlocal
pushd "%~dp0"
echo ============================================
echo    TOEIC - Download KK phoneme audio
echo    (from Wikimedia Commons, CC BY-SA 3.0)
echo ============================================
echo.

REM --- Node.js check (needs 18+ for built-in fetch; no npm packages required) ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Please install the LTS version from https://nodejs.org/ then run again.
  pause & popd & exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Using Node %%v

echo.
echo Downloading audio into Pronunciation\audio ...
echo.
node "%~dp0download-ipa-audio.mjs"
if errorlevel 1 (
  echo.
  echo [ERROR] Download failed. Check your internet connection and try again.
  pause & popd & exit /b 1
)

echo.
pause
popd
endlocal
