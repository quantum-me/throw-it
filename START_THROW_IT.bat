@echo off
title Throw It Game Server
cd /d "C:\Users\Pushmitha\.gemini\antigravity\scratch\throw-it"
set PATH=C:\Users\Pushmitha\AppData\Local\Programs\node;%PATH%
echo ===================================================
echo   THROW IT - Multiplayer Strategy Game
echo   Server is running at: http://localhost:5173/
echo   Press Ctrl+C to stop the server when done.
echo ===================================================
start http://localhost:5173/
npm run dev -- --host --port 5173
pause
