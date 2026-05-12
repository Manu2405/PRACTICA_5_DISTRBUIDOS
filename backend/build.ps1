Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$goCandidates = @(
  (Get-Command go -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
  "$env:ProgramFiles\Go\bin\go.exe",
  "${env:ProgramFiles(x86)}\Go\bin\go.exe",
  "$env:LOCALAPPDATA\Programs\Go\bin\go.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $goCandidates) {
  Write-Error @"
No se encontró 'go.exe'. Opciones:
  1) Instala Go: https://go.dev/dl/  o  winget install GoLang.Go
  2) Cierra y vuelve a abrir la terminal tras instalar (actualiza PATH).
  3) Con Docker Desktop en marcha: docker compose build backend
"@
}

$goExe = $goCandidates
Write-Host "Usando: $goExe"
& $goExe version
& $goExe mod tidy
& $goExe mod download
& $goExe build -o semapa-api.exe ./app
Write-Host "Listo: semapa-api.exe en $(Get-Location)"
