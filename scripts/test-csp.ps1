$ErrorActionPreference = 'Stop'
$taskFrontend = Split-Path -Parent $PSScriptRoot
$taskRuntimeBefore = $env:CSP_RUNTIME
$taskDistBefore = $env:NEXT_DIST_DIR
Push-Location $taskFrontend
try {
    foreach ($taskRuntime in @('development','production')) {
        $env:CSP_RUNTIME = $taskRuntime
        $env:NEXT_DIST_DIR = ".next-csp-$taskRuntime"
        if ($taskRuntime -eq 'production') {
            & node node_modules/next/dist/bin/next build
            if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
        }
        & npx.cmd playwright test --config tests/csp.config.ts
        if ($LASTEXITCODE -ne 0) { throw "CSP $taskRuntime tests failed." }
    }
} finally {
    $env:CSP_RUNTIME = $taskRuntimeBefore
    $env:NEXT_DIST_DIR = $taskDistBefore
    Pop-Location
}
