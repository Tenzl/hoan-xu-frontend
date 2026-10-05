$ErrorActionPreference = 'Stop'
$TaskFrontendRoot = Split-Path -Parent $PSScriptRoot
Push-Location $TaskFrontendRoot
try {
    foreach ($taskScript in @('typecheck','build','test')) {
        & npm.cmd run $taskScript
        if ($LASTEXITCODE -ne 0) { throw "$taskScript failed with code $LASTEXITCODE." }
    }
} finally { Pop-Location }
