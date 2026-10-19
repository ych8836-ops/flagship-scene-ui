$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$record = Join-Path $appRoot 'runtime/processes.local.json'
if (-not (Test-Path -LiteralPath $record)) { Write-Output 'SDK app is not running.'; exit 0 }
# The launcher owns these services and will terminate only its own child processes.
New-Item -ItemType File -Path (Join-Path $appRoot 'runtime/STOP') -Force | Out-Null
Write-Output 'Stop requested for this isolated SDK app. Original ComfyUI is unaffected.'
