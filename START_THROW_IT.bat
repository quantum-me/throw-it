@echo off
title Throw It Game Launcher
cd /d "C:\Users\Pushmitha\.gemini\antigravity\scratch\throw-it"
set PATH=C:\Users\Pushmitha\AppData\Local\Programs\node;%PATH%

echo =========================================================
echo   THROW IT - Multiplayer Strategy Web Game
echo =========================================================
echo   Starting local game server...
echo   Opening http://localhost:5173/ in your browser...
echo.
echo   Keep this window OPEN while playing.
echo   To exit, close this window.
echo =========================================================

:: Open browser after 2 seconds when Vite has initialized
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173/'"

npm run dev -- --host --port 5173
pause
