@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       BACKUP PowerMeet - Pendrive        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Detecta letra do pendrive ──────────────────────────────────
set /p DRIVE="Digite a letra do pendrive (ex: E, F, G): "
set DESTINO=%DRIVE%:\PowerMeet_Backup

if not exist "%DRIVE%:\" (
  echo.
  echo  ERRO: Pendrive "%DRIVE%:\" nao encontrado. Verifique a letra e tente novamente.
  pause
  exit /b 1
)

echo.
echo  Destino: %DESTINO%
echo.

:: ── 1. Codigo do programa (sem node_modules) ───────────────────
echo  [1/3] Copiando codigo do programa...
if exist "%DESTINO%\codigo" rmdir /s /q "%DESTINO%\codigo"
xcopy /e /i /q /exclude:"%~dp0.gitignore_xcopy_exclude.tmp" "%~dp0." "%DESTINO%\codigo" >nul

:: Exclui node_modules e dist manualmente
if exist "%DESTINO%\codigo\node_modules" rmdir /s /q "%DESTINO%\codigo\node_modules"
if exist "%DESTINO%\codigo\dist"         rmdir /s /q "%DESTINO%\codigo\dist"
echo  OK

:: ── 2. Banco de dados ──────────────────────────────────────────
echo  [2/3] Copiando banco de dados...
set DB_ORIGEM=C:\Users\luiz.campos\Desktop\Banco de dados PowerMeet
if exist "%DB_ORIGEM%\powermeet.db" (
  if not exist "%DESTINO%\dados" mkdir "%DESTINO%\dados"
  copy /y "%DB_ORIGEM%\powermeet.db" "%DESTINO%\dados\powermeet.db" >nul
  echo  OK
) else (
  echo  AVISO: Banco de dados nao encontrado em: %DB_ORIGEM%
)

:: ── 3. Logos e anexos (AppData) ────────────────────────────────
echo  [3/3] Copiando logos e anexos...
set APPDATA_PM=%APPDATA%\powermeet
if exist "%APPDATA_PM%\logos" (
  xcopy /e /i /q "%APPDATA_PM%\logos"  "%DESTINO%\dados\logos"  >nul
  echo  Logos: OK
) else (
  echo  Logos: nenhuma encontrada
)
if exist "%APPDATA_PM%\anexos" (
  xcopy /e /i /q "%APPDATA_PM%\anexos" "%DESTINO%\dados\anexos" >nul
  echo  Anexos: OK
) else (
  echo  Anexos: nenhum encontrado
)

:: ── Cria instrucoes na pasta ────────────────────────────────────
(
echo COMO RESTAURAR O POWERMEET NA OUTRA MAQUINA
echo ============================================
echo.
echo 1. Copie a pasta "codigo" para a Area de Trabalho
echo    (renomeie para "PowerMeet" se quiser)
echo.
echo 2. Abra o terminal dentro da pasta e execute:
echo       npm install
echo.
echo 3. Crie uma pasta chamada:
echo       Banco de dados PowerMeet
echo    na Area de Trabalho da outra maquina
echo.
echo 4. Copie o arquivo "dados\powermeet.db" para dentro dessa pasta
echo.
echo 5. Se houver logos: copie a pasta "dados\logos" para:
echo       C:\Users\[seu-usuario]\AppData\Roaming\powermeet\logos
echo.
echo 6. Inicie o programa com INICIAR_APP.bat
echo.
echo 7. Na tela de configuracao, escolha a pasta:
echo       Banco de dados PowerMeet  (que voce criou no passo 3)
echo.
echo    Pronto! Todos os seus dados estarao la.
) > "%DESTINO%\LEIA-ME RESTAURAR.txt"

echo.
echo  ══════════════════════════════════════════
echo  Backup concluido com sucesso!
echo  Pasta: %DESTINO%
echo  ══════════════════════════════════════════
echo.
pause
