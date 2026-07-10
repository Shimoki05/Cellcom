# deploy-vercel.ps1
# Interactive helper to install Vercel CLI, add Supabase env vars, and deploy to production.
# Run this in PowerShell from the project root. Run as Administrator if you hit execution policy errors.

Write-Host "Photocom Vercel Deploy Helper" -ForegroundColor Cyan

# Prompt for Supabase values
$SUPABASE_URL = Read-Host "Enter SUPABASE_URL (e.g. https://nlmhellbkwswweutmeda.supabase.co)"
$SUPABASE_SERVICE_ROLE_KEY = Read-Host -AsSecureString "Enter SUPABASE_SERVICE_ROLE_KEY (will be stored in Vercel)"
$SUPABASE_ANON_KEY = Read-Host -AsSecureString "Enter SUPABASE_ANON_KEY (optional, press Enter to skip)"

# Convert secure strings when needed for temporary display only
function ConvertFrom-SecureStringPlain($ss) {
    if ($null -eq $ss) { return "" }
    try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)) } catch { return "" }
}

$serviceRolePlain = ConvertFrom-SecureStringPlain $SUPABASE_SERVICE_ROLE_KEY
$anonPlain = ConvertFrom-SecureStringPlain $SUPABASE_ANON_KEY

Write-Host "\nValues received (service role hidden). Proceeding..." -ForegroundColor Green

# Optional: adjust execution policy for current user to allow npm installs
$execPolicy = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction SilentlyContinue
if ($execPolicy -eq 'Restricted') {
    Write-Host "Current ExecutionPolicy is Restricted. Setting RemoteSigned for CurrentUser to allow scripts." -ForegroundColor Yellow
    try {
        Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    } catch {
        Write-Warning "Failed to change execution policy. You may need to run PowerShell as Administrator.";
    }
}

# Install Vercel CLI if missing
try {
    $vercelPath = (Get-Command vercel -ErrorAction SilentlyContinue).Path
} catch { $vercelPath = $null }
if (-not $vercelPath) {
    Write-Host "Vercel CLI not found. Installing globally via npm (requires Node.js and npm)." -ForegroundColor Yellow
    npm i -g vercel
    if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed. Ensure Node.js and npm are installed."; exit 1 }
}

# Login to Vercel
Write-Host "Opening browser to log into Vercel..." -ForegroundColor Cyan
vercel login

Write-Host "\nNow adding environment variables for the Production environment. The Vercel CLI will prompt you to paste the values." -ForegroundColor Cyan

Write-Host "Adding SUPABASE_URL..." -ForegroundColor Gray
vercel env add SUPABASE_URL production

Write-Host "Adding SUPABASE_SERVICE_ROLE_KEY (paste the service role key when prompted)..." -ForegroundColor Gray
vercel env add SUPABASE_SERVICE_ROLE_KEY production

if ($anonPlain -ne "") {
    Write-Host "Adding SUPABASE_ANON_KEY..." -ForegroundColor Gray
    vercel env add SUPABASE_ANON_KEY production
} else {
    Write-Host "Skipping SUPABASE_ANON_KEY (not provided)." -ForegroundColor Gray
}

Write-Host "\nAll environment variables added. Deploying to production now..." -ForegroundColor Cyan
vercel --prod

Write-Host "\nIf deploy succeeded, open the deployment URL shown above. If there are errors, copy and paste the error logs into the chat and I'll debug them." -ForegroundColor Green
