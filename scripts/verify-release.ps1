[CmdletBinding()]
param(
  [switch]$Bootstrap,
  [switch]$WithE2E,
  [switch]$WithDocker
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logRoot = Join-Path $root ".launchproof/verification/$stamp"
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Write-Status([string]$Message) {
  Write-Host "[LaunchProof RC] $Message"
}

function Invoke-Gate {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter()][string[]]$Arguments = @()
  )

  $safeName = ($Name -replace '[^A-Za-z0-9._-]', '-')
  $logPath = Join-Path $logRoot "$safeName.log"
  Write-Status "RUN  $Name"
  "# $Executable $($Arguments -join ' ')" | Set-Content -Encoding utf8 $logPath

  & $Executable @Arguments 2>&1 | Tee-Object -FilePath $logPath -Append
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  if ($code -ne 0) {
    Write-Host "[LaunchProof RC] FAIL $Name (exit $code)" -ForegroundColor Red
    Write-Host "Log: $logPath"
    exit $code
  }
  Write-Host "[LaunchProof RC] PASS $Name" -ForegroundColor Green
}

Write-Status "Repository: $root"
Write-Status "Logs: $logRoot"

$nodeVersion = (& node --version).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Node.js is required.' }
if ($nodeVersion -notmatch '^v(24|26)\.') {
  throw "LaunchProof v0.2 RC verification supports Node 24.x (LTS baseline) or Node 26.x (forward-compatibility lane); found $nodeVersion."
}
$nodeMajor = [int](($nodeVersion -replace '^v', '').Split('.')[0])
$runtimeLane = if ($nodeMajor -eq 24) { 'LTS baseline' } else { 'forward compatibility' }
Write-Status "Node runtime: $nodeVersion ($runtimeLane lane)"

Invoke-Gate -Name 'git-status' -Executable 'git' -Arguments @('status', '--short')
Invoke-Gate -Name 'npm-version' -Executable 'npm' -Arguments @('--version')

if ($Bootstrap) {
  Invoke-Gate -Name 'npm-install-bootstrap' -Executable 'npm' -Arguments @('install', '--ignore-scripts')
  if (-not (Test-Path (Join-Path $root 'package-lock.json'))) {
    throw 'npm install completed without creating package-lock.json; refusing to continue.'
  }
} else {
  if (-not (Test-Path (Join-Path $root 'package-lock.json'))) {
    throw 'package-lock.json is missing. Re-run with -Bootstrap once to create the genuine lockfile.'
  }
  Invoke-Gate -Name 'npm-ci' -Executable 'npm' -Arguments @('ci', '--ignore-scripts')
}

Invoke-Gate -Name 'format-check' -Executable 'npm' -Arguments @('run', 'format:check')
Invoke-Gate -Name 'lint' -Executable 'npm' -Arguments @('run', 'lint')
Invoke-Gate -Name 'typecheck' -Executable 'npm' -Arguments @('run', 'typecheck')
Invoke-Gate -Name 'unit-integration-tests' -Executable 'npm' -Arguments @('test')
Invoke-Gate -Name 'web-production-build' -Executable 'npm' -Arguments @('run', 'build', '-w', '@launchproof/web')
Invoke-Gate -Name 'cli-production-build' -Executable 'npm' -Arguments @('run', 'build', '-w', '@launchproof/cli')
Invoke-Gate -Name 'cli-package-dry-run' -Executable 'npm' -Arguments @('pack', '-w', '@launchproof/cli', '--dry-run')

$referenceReport = Join-Path $logRoot 'production-reference.json'
$regressionReport = Join-Path $logRoot 'missing-tenant-authorization.json'
$selfReport = Join-Path $logRoot 'self-report.json'

Invoke-Gate -Name 'cli-production-reference' -Executable 'npm' -Arguments @('run', 'cli', '--', 'analyze', 'scenarios/production-reference', '--json', $referenceReport)
Invoke-Gate -Name 'cli-tenant-regression' -Executable 'npm' -Arguments @('run', 'cli', '--', 'analyze', 'scenarios/missing-tenant-authorization', '--json', $regressionReport)
Invoke-Gate -Name 'cli-self-analysis' -Executable 'npm' -Arguments @('run', 'cli', '--', 'analyze', '.', '--json', $selfReport)

if ($WithE2E) {
  Invoke-Gate -Name 'playwright-browser-install' -Executable 'npx' -Arguments @('playwright', 'install', 'chromium')
  Invoke-Gate -Name 'playwright-e2e' -Executable 'npm' -Arguments @('run', 'test:e2e')
}

if ($WithDocker) {
  Invoke-Gate -Name 'docker-version' -Executable 'docker' -Arguments @('--version')
  Invoke-Gate -Name 'docker-compose-version' -Executable 'docker' -Arguments @('compose', 'version')
  Invoke-Gate -Name 'docker-build' -Executable 'docker' -Arguments @('build', '-t', 'launchproof:0.2.0-rc', '.')
  Invoke-Gate -Name 'docker-compose-config' -Executable 'docker' -Arguments @('compose', 'config', '--quiet')
}

Write-Host ''
Write-Host '[LaunchProof RC] BASELINE CHECKPOINT PASSED' -ForegroundColor Green
Write-Host "Evidence directory: $logRoot"
Write-Host 'Next checkpoint: real scanner ingestion and isolated-runner verification.'
