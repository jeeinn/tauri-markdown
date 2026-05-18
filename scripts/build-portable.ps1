# build-portable.ps1
# Tauri v2 Windows Portable Build Script
# This script builds the app and creates a portable ZIP distribution

param(
    [string]$Version = ""
)

# Auto-detect version from package.json if not provided
if (-not $Version) {
    Write-Host "📱 No version parameter provided, auto-detecting from package.json..." -ForegroundColor Yellow
    try {
        $PackageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $Version = $PackageJson.version
        if (-not $Version) {
            Write-Host "❌ Could not read version from package.json" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Auto-detected version: $Version" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to parse package.json: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📱 Using provided version: $Version" -ForegroundColor Cyan
}

Write-Host "🚀 Starting portable build process..." -ForegroundColor Cyan

# 1. Build Tauri app (only MSI to save time, skip NSIS)
Write-Host "📦 Building Tauri application..." -ForegroundColor Yellow
npm run tauri build -- --bundles msi

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# 2. Define paths
$ReleaseDir = "src-tauri/target/release"
$BundleDir = "src-tauri/target/release/bundle"
$PortableDir = "$BundleDir/portable"

# Auto-detect the executable name from Cargo.toml
$CargoToml = Get-Content "src-tauri/Cargo.toml" -Raw
$NameLine = ($CargoToml -split "`n") | Where-Object { $_ -match '^\s*name\s*=' } | Select-Object -First 1
if ($NameLine) {
    $AppName = ($NameLine -split '"')[1]
} else {
    Write-Host "❌ Could not detect app name from Cargo.toml" -ForegroundColor Red
    exit 1
}

$ExeName = "$AppName.exe"
$ZipName = "${AppName}_${Version}_x64_portable.zip"
$StandaloneZipName = "${AppName}_${Version}_x64_standalone.zip"

Write-Host "📱 Detected app name: $AppName" -ForegroundColor Cyan
Write-Host "📄 Executable: $ExeName" -ForegroundColor Cyan
Write-Host "📦 ZIP filename: $ZipName" -ForegroundColor Cyan
Write-Host "🔢 Version: $Version" -ForegroundColor Cyan

# 3. Create portable directory
Write-Host "📁 Creating portable directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PortableDir | Out-Null

# 4. Create .portable marker file (signals portable mode to the app)
Write-Host "📝 Creating .portable marker file..." -ForegroundColor Yellow
Set-Content -Path "$PortableDir/.portable" -Value "" -Encoding UTF8

# 5. Copy main executable
Write-Host "📋 Copying executable..." -ForegroundColor Yellow
$ExePath = Join-Path $ReleaseDir $ExeName
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Executable not found: $ExePath" -ForegroundColor Red
    exit 1
}
Copy-Item $ExePath "$PortableDir/" -Force

# 6. Copy resources if they exist
if (Test-Path "$ReleaseDir/resources") {
    Write-Host "📋 Copying resources..." -ForegroundColor Yellow
    Copy-Item -Recurse "$ReleaseDir/resources" "$PortableDir/" -Force
}

# 7. Copy sidecar binaries if they exist
if (Test-Path "$ReleaseDir/sidecars") {
    Write-Host "📋 Copying sidecars..." -ForegroundColor Yellow
    Copy-Item -Recurse "$ReleaseDir/sidecars" "$PortableDir/" -Force
}

# 8. Create README for portable version
$ReadmeContent = @"
# $AppName Portable Version

## Requirements
- Windows 10 20H2 or later (with WebView2 Runtime)
- WebView2 Runtime is included in Windows 10/11 by default

## Usage
1. Extract this ZIP to any folder
2. Run $ExeName
3. No installation required!

## Notes
- All data (config, logs) is stored in the same directory as the executable
- This enables true portability - just copy the folder anywhere
- Auto-update is not supported in portable mode

## Version
$Version

## Built with Tauri v2
"@

Set-Content -Path "$PortableDir/README.txt" -Value $ReadmeContent -Encoding UTF8

# 9. Package as ZIP
Write-Host "🗜️ Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path "$PortableDir/*" -DestinationPath "$BundleDir/$ZipName" -Force

# 10. Display results
Write-Host "`n✅ Portable build completed successfully!" -ForegroundColor Green
Write-Host "📦 Output: $BundleDir/$ZipName" -ForegroundColor Cyan
$FileSize = (Get-Item "$BundleDir/$ZipName").Length / 1MB
Write-Host "📊 Size: $FileSize MB" -ForegroundColor Cyan

# Optional: Also create a simple EXE-only distribution
Write-Host "`n📦 Creating standalone EXE distribution..." -ForegroundColor Yellow
$StandaloneDir = "$BundleDir/standalone"
New-Item -ItemType Directory -Force -Path $StandaloneDir | Out-Null
Copy-Item $ExePath "$StandaloneDir/" -Force
Compress-Archive -Path "$StandaloneDir/*" -DestinationPath "$BundleDir/$StandaloneZipName" -Force

Write-Host "✅ Standalone EXE created: $BundleDir/$StandaloneZipName" -ForegroundColor Green

Write-Host "`n🎉 All portable distributions created successfully!" -ForegroundColor Green
