# install-skill.ps1 — 把当前仓库（即完整 Skill）链接到 Codex skills 目录
# 用法: powershell -ExecutionPolicy Bypass -File install-skill.ps1 [-CodexHome D:\x] [-Mode copy]
param(
  [string]$CodexHome = "",
  [ValidateSet("junction", "copy")] [string]$Mode = "junction",
  [switch]$SkipDeps
)
$ErrorActionPreference = "Stop"
$skillSrc = $PSScriptRoot
if (-not $CodexHome) { $CodexHome = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".codex" }
$skillsDir = Join-Path $CodexHome "skills"
New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
$target = Join-Path $skillsDir "poster-design"
if (Test-Path $target) {
  $item = Get-Item -LiteralPath $target -Force
  if ($item.LinkType -eq "Junction" -and $item.Target -eq $skillSrc) { Write-Output "[skip] already linked: $target"; }
  else { Write-Error "exists but differs: $target (remove it manually or use another -CodexHome)" }
} elseif ($Mode -eq "junction") {
  New-Item -ItemType Junction -Path $target -Target $skillSrc | Out-Null
  Write-Output "[ok] linked: $target  ->  $skillSrc"
} else {
  Copy-Item -LiteralPath $skillSrc -Destination $target -Recurse
  Write-Output "[ok] copied: $target  <-  $skillSrc"
}
Write-Output "[ok] installed. 验证: node $target/scripts/poster.js dna-presets list"
