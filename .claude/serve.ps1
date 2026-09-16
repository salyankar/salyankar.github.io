# Minimal static file server for local preview: powershell -File serve.ps1 -Port 8765
param([int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8765 }), [string]$Root = "")
$root = if ($Root) { Resolve-Path $Root } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript'; '.css'='text/css'; '.json'='application/json'; '.png'='image/png'; '.svg'='image/svg+xml' }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
  if ($rel -eq "" -or $rel.EndsWith("/")) { $rel = $rel + "index.html" }
  $file = Join-Path $root $rel
  if (Test-Path $file -PathType Leaf) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
