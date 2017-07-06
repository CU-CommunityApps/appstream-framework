Add-Type -AssemblyName System.IO.Compression.FileSystem
Import-Module BitsTransfer

$S3_BUCKET = "cu-deng-appstream-packages"
$WORK_DIR = $env:TEMP
cd $WORK_DIR

<#function CreatePackageForm($packages) {
	[reflection.assembly]::loadwithpartialname("System.Windows.Forms") | Out-Null
	[reflection.assembly]::loadwithpartialname("System.Drawing") | Out-Null
	
	$form = New-Object System.Windows.Forms.Form
	$button = New-Object System.Windows.Forms.Button
	
	
}#>

$packages = @()
[xml]$s3BucketList = (Invoke-WebRequest "https://s3.amazonaws.com/${S3_BUCKET}").Content

foreach ($s3Object in $s3BucketList.ListBucketResult.Contents) {
	$s3Key = $s3Object.Key

	if ($s3Key.StartsWith('packages') -And $s3Key.ToLower().EndsWith('.zip')) {
		$packages += $s3Object.Key
	}
}

foreach ($package in $packages) {
	$s3Key = [System.Uri]"https://s3.amazonaws.com/${S3_BUCKET}/${package}"
	$zipName = [io.path]::GetFileName($s3Key.AbsolutePath)
	$baseName = [io.path]::GetFileNameWithoutExtension($s3Key.AbsolutePath)
	$zipPath = "${WORK_DIR}\${zipName}"
	$extractPath = "${WORK_DIR}\${baseName}"
	
	echo "Downloading Package: ${zipName}..."
	Start-BitsTransfer $s3Key.AbsoluteUri $zipPath
	
	# In PowerShell V5 (Win 10 / 2016) the following can be replaced with: 
	# Expand-Archive $zipPath -DestinationPath $extractPath
	
	echo "Extracting Package: ${zipName}..."
	[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractPath)
}

echo "Done!"
