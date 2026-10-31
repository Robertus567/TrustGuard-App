@echo off
title TrustGuard
cd /d "%~dp0"
echo ==========================================
echo   TrustGuard - memulai aplikasi
echo ==========================================
echo.
if exist "server.js" goto haveapp
echo [X] server.js tidak ditemukan. Ekstrak ZIP dulu (klik kanan, Extract All), lalu jalankan start.bat dari folder hasilnya.
goto theend
:haveapp
set "PATH=%PATH%;%ProgramW6432%\nodejs;%LocalAppData%\Programs\nodejs"
where node >nul 2>&1
if errorlevel 1 goto nonode
node -e "process.exit(parseInt(process.versions.node)>=18?0:1)"
if errorlevel 1 goto oldnode
echo [OK] Node.js terdeteksi.
if not exist ".env" if exist ".env.txt" ren ".env.txt" ".env"
if not exist ".env" copy ".env.example" ".env" >nul
findstr /r /c:"GEMINI_API_KEY=..*" ".env" >nul 2>&1
if not errorlevel 1 goto keyok
echo.
echo [!] GEMINI_API_KEY belum terisi.
echo     Tempel API key lalu tekan Enter, atau langsung Enter untuk lanjut tanpa Gemini (mode lokal).
set "KEY="
set /p "KEY=API key: "
if not defined KEY goto keyok
set "KEY=%KEY: =%"
set "KEY=%KEY:"=%"
> ".env" echo GEMINI_API_KEY=%KEY%
>> ".env" echo GEMINI_MODEL=
echo [OK] Key disimpan di %CD%\.env
:keyok
echo.
echo Menjalankan server. Jangan tutup jendela ini selama aplikasi dipakai.
set OPEN=1
node server.js
echo.
echo [!] Server berhenti. Baca pesan di atas untuk melihat penyebabnya.
goto theend
:nonode
echo [X] Node.js tidak ditemukan. Pasang versi LTS dari https://nodejs.org lalu jalankan start.bat lagi.
goto theend
:oldnode
echo [X] Versi Node.js terlalu lama. Dibutuhkan versi 18 atau lebih baru.
:theend
echo.
pause
