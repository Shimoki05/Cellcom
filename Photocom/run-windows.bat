@echo off
rem Runs npm and vercel using the .cmd wrappers to avoid PowerShell script policy issues
setlocal
if not defined VERCEL_TOKEN (
  echo WARNING: VERCEL_TOKEN environment variable is not set. Set it or the deploy step may fail.
)
rem Prefer the Node installation under %ProgramFiles% but fall back to PATH
if exist "%ProgramFiles%\nodejs\npm.cmd" (
  set "NPM=%ProgramFiles%\nodejs\npm.cmd"
) else (
  set "NPM=npm.cmd"
)
if exist "%ProgramFiles%\nodejs\npx.cmd" (
  set "NPX=%ProgramFiles%\nodejs\npx.cmd"
) else (
  set "NPX=npx.cmd"
)

%NPM% ci || exit /b %ERRORLEVEL%
%NPM% run generate-config || exit /b %ERRORLEVEL%
%NPM% run migrate-localstorage || exit /b %ERRORLEVEL%
%NPX% vercel --prod --token %VERCEL_TOKEN%
endlocal
