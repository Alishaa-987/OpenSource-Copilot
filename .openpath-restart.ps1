$ErrorActionPreference = 'Continue'
Set-Location 'E:\mc_project'

$ports = 3000, 3001, 3002, 3003, 3004
$pids = @(netstat -ano | Select-String 'LISTENING' | ForEach-Object {
  $parts = ($_ -replace '^\s+', '') -split '\s+'
  if ($parts.Length -ge 5 -and $parts[1] -match ':(3000|3001|3002|3003|3004)$') { [int]$parts[4] }
} | Sort-Object -Unique)
foreach ($pid in $pids) { if ($pid -and $pid -ne $PID) { taskkill /F /PID $pid 2>$null | Out-Null } }
Start-Sleep -Seconds 2

$services = @(
  @{ Name = 'gateway'; Port = 3000; Command = 'node dist\apps\gateway\main.js' },
  @{ Name = 'repository-service'; Port = 3001; Command = 'node dist\apps\repository-service\main.js' },
  @{ Name = 'guidance-service'; Port = 3002; Command = 'node dist\apps\guidance-service\main.js' },
  @{ Name = 'knowledge-service'; Port = 3003; Command = 'node dist\apps\knowledge-service\main.js' },
  @{ Name = 'web'; Port = 3004; Command = 'pnpm --dir apps\web start -- -p 3004' }
)
foreach ($service in $services) {
  $out = Join-Path (Get-Location) ('.openpath-' + $service.Name + '-live.log')
  $err = Join-Path (Get-Location) ('.openpath-' + $service.Name + '-live.err.log')
  Remove-Item $out, $err -Force -ErrorAction SilentlyContinue
  $cmd = "set PORT=$($service.Port)&& $($service.Command)"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory 'E:\mc_project' -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden | Out-Null
  Write-Output "started $($service.Name) on $($service.Port)"
}

Start-Sleep -Seconds 12
foreach ($port in $ports) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$port/api/health/live" -TimeoutSec 8
    Write-Output "health $port $($response.StatusCode)"
  } catch {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$port" -TimeoutSec 8
      Write-Output "root $port $($response.StatusCode)"
    } catch { Write-Output "unavailable $port" }
  }
}
