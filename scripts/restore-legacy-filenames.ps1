param(
    [string]$RootDir = "$env:USERPROFILE\.ng-manager",
    [switch]$DryRun
)

if (-not (Test-Path -LiteralPath $RootDir)) {
    Write-Host "Root directory not found: $RootDir"
    exit 1
}

$rows = Get-ChildItem -Path $RootDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '\.legacy\.\d+' } |
    ForEach-Object {
        $ext = [IO.Path]::GetExtension($_.Name)
        $stem = [IO.Path]::GetFileNameWithoutExtension($_.Name)
        $cleanStem = [regex]::Replace($stem, '\.legacy\.\d+', '')
        [pscustomobject]@{
            File       = $_
            TargetName = "$cleanStem$ext"
            TargetPath = Join-Path $_.DirectoryName "$cleanStem$ext"
        }
    }

if (-not $rows -or $rows.Count -eq 0) {
    Write-Host "No .legacy.<timestamp> files found under: $RootDir"
    exit 0
}

$renamed = 0
$skipped = 0
$duplicates = 0

$rows | Group-Object TargetPath | ForEach-Object {
    $group = $_.Group | Sort-Object { $_.File.LastWriteTimeUtc } -Descending
    $winner = $group[0]

    if (-not (Test-Path -LiteralPath $winner.TargetPath)) {
        if ($DryRun) {
            Write-Host "[DRY-RUN] RENAME: $($winner.File.FullName) -> $($winner.TargetPath)"
        }
        else {
            Rename-Item -LiteralPath $winner.File.FullName -NewName $winner.TargetName
            Write-Host "RENAMED: $($winner.File.FullName) -> $($winner.TargetPath)"
        }
        $renamed++
    }
    elseif ($winner.File.FullName -ne $winner.TargetPath) {
        Write-Host "SKIP (target exists): $($winner.TargetPath)"
        $skipped++
    }

    if ($group.Count -gt 1) {
        $group[1..($group.Count - 1)] | ForEach-Object {
            Write-Host "KEEP legacy duplicate: $($_.File.FullName)"
            $duplicates++
        }
    }
}

Write-Host ""
Write-Host "Done. renamed=$renamed skipped=$skipped duplicates=$duplicates root=$RootDir"
