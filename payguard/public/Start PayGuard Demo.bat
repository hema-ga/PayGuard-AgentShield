@echo off
title PayGuard Local Demo and MCP Gateway
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  python gateway_server.py
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3 gateway_server.py
  ) else (
    echo Python 3 was not found. Install Python, then run this file again.
    pause
  )
)
if errorlevel 1 (
  echo.
  echo PayGuard could not start. Make sure Python is installed and port 4173 is free.
  pause
)
