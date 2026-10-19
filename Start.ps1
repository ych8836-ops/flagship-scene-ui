$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Get-Content -LiteralPath (Join-Path $appRoot 'config.local.json') -Raw | ConvertFrom-Json
& $config.comfy_python -B -X utf8 (Join-Path $appRoot 'run.py') @args
exit $LASTEXITCODE
