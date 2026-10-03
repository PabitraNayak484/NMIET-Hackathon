# ============================================================
# demo-check.ps1 — SATHI Demo Rehearsal Checklist
# Run before the demo: .\scripts\demo-check.ps1
# ============================================================

$pass = 0
$fail = 0

function Check($label, $ok) {
  if ($ok) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $label" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SATHI Demo Rehearsal Checklist" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. Tests pass ────────────────────────────────────────────
Write-Host "[ Tests ]" -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
$testResult = npx vitest run --reporter=verbose 2>&1
$testsPassed = $testResult -match "Tests.*passed"
Check "93 unit tests pass" $testsPassed
Pop-Location

# ── 2. Backend health ─────────────────────────────────────────
Write-Host ""
Write-Host "[ Backend ]" -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod "http://localhost:8000/api/health" -TimeoutSec 3 -ErrorAction Stop
  Check "Backend health endpoint responds" ($health -ne $null)
} catch {
  Check "Backend health endpoint responds" $false
}

# ── 3. LLM gateway live (Qwen 3 via OpenRouter) ──────────────
Write-Host ""
Write-Host "[ LLM — Qwen 3 via OpenRouter ]" -ForegroundColor Yellow
try {
  $body = @{
    topic_id       = "photosynthesis"
    class_num      = 7
    language       = "en"
    source_text    = "Photosynthesis is the process by which plants make food using sunlight, water, and carbon dioxide."
    protected_terms = @("photosynthesis", "chlorophyll")
    max_words      = 60
  } | ConvertTo-Json

  $llmResp = Invoke-RestMethod "http://localhost:8000/api/llm/rephrase" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -TimeoutSec 15 `
    -ErrorAction Stop

  $modeLabel = if ($llmResp.fallback) { 'FALLBACK' } else { 'LLM' }
  Check "LLM rephrase returns text ($modeLabel)" $llmOk

  if ($llmResp.validated) {
    Write-Host "        validated=true, mode=llm_rephrase" -ForegroundColor Gray
  } else {
    Write-Host "        fallback=true (template-based, LLM key not set or unavailable)" -ForegroundColor DarkYellow
  }
} catch {
  Check "LLM rephrase endpoint reachable" $false
  Write-Host "        Error: $($_.Exception.Message)" -ForegroundColor DarkRed
}

# ── 4. Content pack present ───────────────────────────────────
Write-Host ""
Write-Host "[ Content ]" -ForegroundColor Yellow
$packPath = "$PSScriptRoot\..\content\packs\class7-science-v1.json"
Check "class7-science-v1.json present" (Test-Path $packPath)
if (Test-Path $packPath) {
  $pack = Get-Content $packPath | ConvertFrom-Json
  $topics = $pack.topics.Count
  Check "Pack has $topics topics (expect 2+)" ($topics -ge 2)
}

# ── 5. Frontend .env set ─────────────────────────────────────
Write-Host ""
Write-Host "[ Frontend config ]" -ForegroundColor Yellow
$envPath = "$PSScriptRoot\..\frontend\.env"
Check ".env exists in frontend/" (Test-Path $envPath)
if (Test-Path $envPath) {
  $env = Get-Content $envPath -Raw
  Check "VITE_API_BASE_URL set" ($env -match "VITE_API_BASE_URL=")
}

# ── 6. Architecture image ─────────────────────────────────────
Write-Host ""
Write-Host "[ Documentation ]" -ForegroundColor Yellow
Check "docs/architecture.jpg present" (Test-Path "$PSScriptRoot\..\docs\architecture.jpg")
Check "README.md written" (Test-Path "$PSScriptRoot\..\README.md")
Check "docs/KNOWN_LIMITATIONS.md present" (Test-Path "$PSScriptRoot\..\docs\KNOWN_LIMITATIONS.md")
Check "docs/API.md present" (Test-Path "$PSScriptRoot\..\docs\API.md")
Check "backend/.env.example present" (Test-Path "$PSScriptRoot\..\backend\.env.example")

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ("  RESULT: {0} passed · {1} failed" -f $pass, $fail) -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) {
  Write-Host "  Manual steps before demo:" -ForegroundColor Yellow
  Write-Host "   1. Start backend:    cd backend; uvicorn app.main:app --reload" -ForegroundColor Gray
  Write-Host "   2. Start frontend:   cd frontend; npm run dev" -ForegroundColor Gray
  Write-Host "   3. Open app:         http://localhost:5173" -ForegroundColor Gray
  Write-Host "   4. Load Demo:        Profile Picker → Load Demo (Priya) 🌻" -ForegroundColor Gray
  Write-Host "   5. Test offline:     DevTools → Application → SW → Offline" -ForegroundColor Gray
  Write-Host "   6. Check debug:      http://localhost:5173?debug=1" -ForegroundColor Gray
  Write-Host ""
}
