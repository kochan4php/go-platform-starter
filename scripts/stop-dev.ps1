# Stops go-platform-starter native dev processes (go binaries under
# tmp/dev/bin and vite dev servers). Scoped by command line so other
# projects' processes are never touched.
Get-CimInstance Win32_Process | Where-Object {
    ($_.CommandLine -like '*tmp*dev*bin*') -or
    ($_.CommandLine -match 'vite' -and $_.CommandLine -match '517[3456]')
} | ForEach-Object {
    Write-Output ("stopping " + $_.ProcessId)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
