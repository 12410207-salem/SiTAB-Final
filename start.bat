@echo off
title SiTAB UNKLAB - Sistem Titip Antar Barang
color 0A
echo.
echo  ██████╗ ██╗████████╗ █████╗ ██████╗ 
echo  ██╔══██╗██║╚══██╔══╝██╔══██╗██╔══██╗
echo  ╚█████╔╝██║   ██║   ███████║██████╔╝
echo   ╚═══██╗██║   ██║   ██╔══██║██╔══██╗
echo  ██████╔╝██║   ██║   ██║  ██║██████╔╝
echo  ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═════╝ 
echo.
echo  Sistem Titip ^& Antar Barang Kampus UNKLAB
echo  Kelompok Miedal - FIK UNKLAB 2024
echo  -------------------------------------------
echo  Server: http://localhost:3000
echo  -------------------------------------------
echo.
start "" "http://localhost:3000"
node server.js
pause
