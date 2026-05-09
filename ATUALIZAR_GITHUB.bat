@echo off
cd /d "%~dp0"

echo.
echo ============================================
echo    ATUALIZANDO PROJETO NO GITHUB...
echo ============================================
echo.

git add .

for /f "tokens=1-5 delims=/ " %%a in ("%date%") do set DATA=%%c-%%b-%%a
for /f "tokens=1-2 delims=:." %%a in ("%time%") do set HORA=%%a:%%b

set MENSAGEM=Atualizacao %DATA% %HORA%

git commit -m "%MENSAGEM%"

git push origin main

echo.
echo ============================================
echo    CONCLUIDO! Projeto enviado ao GitHub.
echo ============================================
echo.
pause
