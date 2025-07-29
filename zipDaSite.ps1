$folder = "C:\temp\mc1234\heritage-restored-site\dist"
$zipPath = Join-Path $folder "dist.zip"

# Remove existing zip file if it exists
if (Test-Path $zipPath) {
    Write-Host "Removing existing dist.zip..."
    Remove-Item $zipPath
}

# Create zip from folder contents
Write-Host "Creating zip..."
Compress-Archive -Path "$folder\*" -DestinationPath $zipPath

Write-Host "Zip file created at: $zipPath"
