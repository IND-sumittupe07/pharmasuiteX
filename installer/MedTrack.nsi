; ─────────────────────────────────────────────────────────────────────────────
; MedTrack Windows Installer Script
; Built with NSIS (Nullsoft Scriptable Install System)
; Creates: MedTrack-Setup-v1.0.0.exe
; ─────────────────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

; ── Installer Info ────────────────────────────────────────────────────────────
Name "MedTrack Pharmacy Suite"
OutFile "MedTrack-Setup-v1.0.0.exe"
InstallDir "$PROGRAMFILES64\MedTrack"
InstallDirRegKey HKLM "Software\MedTrack" "InstallDir"
RequestExecutionLevel admin
BrandingText "MedTrack v1.0.0 — Pharmacy Management Suite"
SetCompressor /SOLID lzma

; ── Version Info (shows in file properties) ──────────────────────────────────
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "MedTrack"
VIAddVersionKey "CompanyName" "MedTrack Technologies"
VIAddVersionKey "LegalCopyright" "© 2026 MedTrack"
VIAddVersionKey "FileDescription" "MedTrack Pharmacy Suite Installer"
VIAddVersionKey "FileVersion" "1.0.0"

; ── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\sidebar.bmp"
!define MUI_WELCOMEPAGE_TITLE "Welcome to MedTrack Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install MedTrack Pharmacy Suite on your computer.$\r$\n$\r$\nMedTrack helps you manage customers, medicines, refill reminders and marketing campaigns for your medical store.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN "$INSTDIR\MedTrack.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch MedTrack now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "View quick start guide"

; ── Pages ─────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "assets\LICENSE.txt"
Page custom DatabasePage DatabasePageLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Database Config Page ──────────────────────────────────────────────────────
Var Dialog
Var DBHostLabel
Var DBHostField
Var DBPortLabel
Var DBPortField
Var DBNameLabel
Var DBNameField
Var DBUserLabel
Var DBUserField
Var DBPassLabel
Var DBPassField

Var DBHost
Var DBPort
Var DBName
Var DBUser
Var DBPass

Function DatabasePage
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ; Title
  ${NSD_CreateLabel} 0 0 100% 20u "Database Configuration"
  Pop $0
  SetCtlColors $0 0x1e293b 0xFFFFFF
  CreateFont $1 "Segoe UI" 11 700
  SendMessage $0 ${WM_SETFONT} $1 0

  ${NSD_CreateLabel} 0 22u 100% 14u "Enter your PostgreSQL database details:"
  Pop $0

  ; Host
  ${NSD_CreateLabel} 0 45u 30% 12u "Database Host:"
  Pop $DBHostLabel
  ${NSD_CreateText} 32% 43u 65% 14u "localhost"
  Pop $DBHostField

  ; Port
  ${NSD_CreateLabel} 0 65u 30% 12u "Port:"
  Pop $DBPortLabel
  ${NSD_CreateText} 32% 63u 65% 14u "5432"
  Pop $DBPortField

  ; DB Name
  ${NSD_CreateLabel} 0 85u 30% 12u "Database Name:"
  Pop $DBNameLabel
  ${NSD_CreateText} 32% 83u 65% 14u "medtrack"
  Pop $DBNameField

  ; Username
  ${NSD_CreateLabel} 0 105u 30% 12u "Username:"
  Pop $DBUserLabel
  ${NSD_CreateText} 32% 103u 65% 14u "postgres"
  Pop $DBUserField

  ; Password
  ${NSD_CreateLabel} 0 125u 30% 12u "Password:"
  Pop $DBPassLabel
  ${NSD_CreatePassword} 32% 123u 65% 14u ""
  Pop $DBPassField

  ${NSD_CreateLabel} 0 148u 100% 24u "Note: PostgreSQL must be installed separately. Download from https://postgresql.org"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function DatabasePageLeave
  ${NSD_GetText} $DBHostField $DBHost
  ${NSD_GetText} $DBPortField $DBPort
  ${NSD_GetText} $DBNameField $DBName
  ${NSD_GetText} $DBUserField $DBUser
  ${NSD_GetText} $DBPassField $DBPass

  ${If} $DBPass == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please enter your PostgreSQL password."
    Abort
  ${EndIf}
FunctionEnd

; ── Install Sections ──────────────────────────────────────────────────────────
Section "MedTrack Core" SecCore
  SectionIn RO  ; Required — cannot deselect

  SetOutPath "$INSTDIR"

  ; ── Write all files ──────────────────────────────────────────────────────
  File /r "dist\backend\*.*"
  File /r "dist\frontend-build\*.*"
  File "assets\MedTrack.exe"
  File "assets\icon.ico"
  File "assets\README.txt"

  ; ── Write .env file with user's DB settings ──────────────────────────────
  FileOpen $0 "$INSTDIR\backend\.env" w
  FileWrite $0 "PORT=5000$\r$\n"
  FileWrite $0 "NODE_ENV=production$\r$\n"
  FileWrite $0 "DATABASE_URL=postgresql://$DBUser:$DBPass@$DBHost:$DBPort/$DBName$\r$\n"
  FileWrite $0 "JWT_SECRET=$DBPass-medtrack-secret-key-2026$\r$\n"
  FileWrite $0 "JWT_EXPIRES_IN=7d$\r$\n"
  FileWrite $0 "FRONTEND_URL=http://localhost:3000$\r$\n"
  FileClose $0

  ; ── Run database migrations ───────────────────────────────────────────────
  DetailPrint "Setting up database tables..."
  ExecWait '"$INSTDIR\backend\node.exe" "$INSTDIR\backend\src\db\migrate.js"' $0
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "Database setup failed. Please check your PostgreSQL settings and try again."
  ${Else}
    DetailPrint "Database setup complete!"
    ; Seed demo data
    ExecWait '"$INSTDIR\backend\node.exe" "$INSTDIR\backend\src\db\seed.js"' $0
  ${EndIf}

  ; ── Create Start Menu shortcuts ───────────────────────────────────────────
  CreateDirectory "$SMPROGRAMS\MedTrack"
  CreateShortcut "$SMPROGRAMS\MedTrack\MedTrack.lnk" "$INSTDIR\MedTrack.exe" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\MedTrack\Uninstall MedTrack.lnk" "$INSTDIR\Uninstall.exe"

  ; ── Desktop shortcut ─────────────────────────────────────────────────────
  CreateShortcut "$DESKTOP\MedTrack.lnk" "$INSTDIR\MedTrack.exe" "" "$INSTDIR\icon.ico" 0

  ; ── Windows startup (optional — auto-start with Windows) ─────────────────
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MedTrack" "$INSTDIR\MedTrack.exe --minimized"

  ; ── Registry entries (for Add/Remove Programs) ───────────────────────────
  WriteRegStr HKLM "Software\MedTrack" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\MedTrack" "Version" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "DisplayName" "MedTrack Pharmacy Suite"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "Publisher" "MedTrack Technologies"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "URLInfoAbout" "https://medtrack.in"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "NoRepair" 1

  ; ── Estimate install size ─────────────────────────────────────────────────
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack" "EstimatedSize" "$0"

  ; ── Write uninstaller ─────────────────────────────────────────────────────
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  DetailPrint "MedTrack installed successfully!"

SectionEnd

; ── Uninstaller ───────────────────────────────────────────────────────────────
Section "Uninstall"

  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to keep your customer data (database)?" IDYES KeepData
    ; Remove data only if user says No
    DetailPrint "Note: Your PostgreSQL database data is preserved."
  KeepData:

  ; Kill running processes
  ExecWait 'taskkill /F /IM MedTrack.exe'
  ExecWait 'taskkill /F /IM node.exe'

  ; Remove files
  RMDir /r "$INSTDIR\backend"
  RMDir /r "$INSTDIR\frontend-build"
  Delete "$INSTDIR\MedTrack.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove shortcuts
  Delete "$DESKTOP\MedTrack.lnk"
  Delete "$SMPROGRAMS\MedTrack\MedTrack.lnk"
  Delete "$SMPROGRAMS\MedTrack\Uninstall MedTrack.lnk"
  RMDir "$SMPROGRAMS\MedTrack"

  ; Remove registry entries
  DeleteRegKey HKLM "Software\MedTrack"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MedTrack"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MedTrack"

  DetailPrint "MedTrack uninstalled successfully."

SectionEnd
