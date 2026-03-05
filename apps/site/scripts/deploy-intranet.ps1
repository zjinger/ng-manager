param(
  [string]$ServerIp = "192.168.1.31",
  [string]$ServerUser = "root",
  [int]$ServerPort = 22,
  [string]$RemoteRoot = "/var/www/ng-manager-site",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$siteRoot = Resolve-Path (Join-Path $scriptDir "..")
$distDir = Join-Path $siteRoot "docs/.vitepress/dist"

if (-not $SkipBuild) {
  Write-Host "[1/4] Build vitepress site..."
  Push-Location $siteRoot
  try {
    Invoke-CheckedCommand -Command "npm.cmd" -Arguments @("run", "docs:build")
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $distDir)) {
  throw "Build output not found: $distDir"
}

$releaseName = Get-Date -Format "yyyyMMddHHmmss"
$archiveName = "site-$releaseName.tar.gz"
$localArchive = Join-Path $env:TEMP $archiveName
$remoteArchive = "/tmp/$archiveName"
$remoteReleaseDir = "$RemoteRoot/releases/$releaseName"

if (Test-Path $localArchive) {
  Remove-Item $localArchive -Force
}

Write-Host "[2/4] Pack build output..."
Invoke-CheckedCommand -Command "tar" -Arguments @("-czf", $localArchive, "-C", $distDir, ".")

Write-Host "[3/4] Upload package to $ServerUser@$ServerIp..."
Invoke-CheckedCommand -Command "scp" -Arguments @("-P", "$ServerPort", $localArchive, "$ServerUser@$ServerIp`:$remoteArchive")

$remoteCommand = @(
  "set -e",
  "mkdir -p '$RemoteRoot/releases'",
  "mkdir -p '$remoteReleaseDir'",
  "tar -xzf '$remoteArchive' -C '$remoteReleaseDir'",
  "ln -sfn '$remoteReleaseDir' '$RemoteRoot/current'",
  "rm -f '$remoteArchive'"
) -join "; "

Write-Host "[4/4] Deploy on server..."
Invoke-CheckedCommand -Command "ssh" -Arguments @("-p", "$ServerPort", "$ServerUser@$ServerIp", $remoteCommand)

if (Test-Path $localArchive) {
  Remove-Item $localArchive -Force
}

Write-Host ""
Write-Host "Deployment completed."
Write-Host "Server: $ServerIp"
Write-Host "Current release: $remoteReleaseDir"
Write-Host "Symlink: $RemoteRoot/current"
