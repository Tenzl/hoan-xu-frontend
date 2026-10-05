$ErrorActionPreference = 'Stop'
$TaskFrontendRoot = Split-Path -Parent $PSScriptRoot
Push-Location $TaskFrontendRoot
try {
    & npm.cmd run dev
    if ($LASTEXITCODE -ne 0) { throw "Frontend exited with code $LASTEXITCODE." }
} finally { Pop-Location }
