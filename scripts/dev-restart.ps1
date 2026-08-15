# Reliable dev-server restart.
#
# Next writes .next while the dev server reads it. Starting a second server, or
# running `next build`, against a live one leaves the first serving a directory
# that has been swapped underneath it, and every request then 500s with a
# missing routes-manifest.json. Killing first, and waiting for the port to
# actually accept, avoids that.
#
#   powershell -ExecutionPolicy Bypass -File scripts/dev-restart.ps1 [-Port 3111]

param([int]$Port = 3111)

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*next*' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }

Start-Sleep -Seconds 3

$root = Split-Path $PSScriptRoot -Parent
Remove-Item -Recurse -Force (Join-Path $root ".next") -ErrorAction SilentlyContinue

Push-Location $root
Start-Process -FilePath "npx" -ArgumentList "next dev -p $Port" -WindowStyle Hidden
Pop-Location

# Poll until the server actually answers, rather than sleeping a guessed amount.
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { "dev ready on $Port after $($i * 2 + 2)s"; exit 0 }
  } catch { }
}
"dev did NOT become ready on $Port"
exit 1
