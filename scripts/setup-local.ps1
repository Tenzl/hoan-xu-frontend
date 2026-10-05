$ErrorActionPreference = 'Stop'
foreach ($taskName in @('node','npm.cmd')) {
    $taskCommand = Get-Command $taskName -ErrorAction SilentlyContinue
    if ($taskCommand) { Write-Host "$taskName : $($taskCommand.Source)" }
    else { Write-Warning "Missing $taskName. Install Node.js 22 or newer." }
}
Write-Host 'Next: npm ci, configure .env.local from .env.example, then scripts/dev.ps1.'
