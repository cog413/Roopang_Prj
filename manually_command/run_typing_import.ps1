# Imports typing_contents to D1 remote via wrangler --command batches
# Usage: powershell -File manually_command/run_typing_import.ps1

$ErrorActionPreference = 'Stop'
$BATCH_SIZE = 50
$SQL_FILE = Join-Path $PSScriptRoot 'import_typing_contents_260511.sql'

$lines = Get-Content $SQL_FILE -Encoding UTF8 | Where-Object { $_.Trim() -ne '' }
$deleteLine = $lines[0]
$inserts = $lines[1..($lines.Length - 1)]

Write-Host "Total inserts: $($inserts.Count)"
Write-Host "Step 1: DELETE FROM typing_contents"

$result = npx wrangler d1 execute DB --remote --command $deleteLine 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "DELETE failed: $result"; exit 1 }

$totalBatches = [Math]::Ceiling($inserts.Count / $BATCH_SIZE)
for ($i = 0; $i -lt $inserts.Count; $i += $BATCH_SIZE) {
    $end = [Math]::Min($i + $BATCH_SIZE - 1, $inserts.Count - 1)
    $batchNum = [Math]::Floor($i / $BATCH_SIZE) + 1
    $batch = ($inserts[$i..$end]) -join "`n"
    Write-Host "Batch $batchNum/$totalBatches (rows $($i+1)-$($end+1))..." -NoNewline
    $result = npx wrangler d1 execute DB --remote --command $batch 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Error "Batch $batchNum failed: $result"; exit 1 }
    Write-Host " ok"
}

Write-Host "Done. $($inserts.Count) rows imported."
