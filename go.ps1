Add-Type -AssemblyName System.IO.Compression.FileSystem
Import-Module BitsTransfer

$S3_BUCKET = "cu-deng-appstream-packages"
$PS_VERSION = $PSVersionTable.PSVersion.Major
$WORK_DIR = $env:TEMP
cd $WORK_DIR

<#function CreatePackageForm($packages) {
	[reflection.assembly]::loadwithpartialname("System.Windows.Forms") | Out-Null
	[reflection.assembly]::loadwithpartialname("System.Drawing") | Out-Null
	
	$form = New-Object System.Windows.Forms.Form
	$button = New-Object System.Windows.Forms.Button
	
}#>

$packages = @()
$s3BucketList = [xml](Invoke-WebRequest "https://s3.amazonaws.com/${S3_BUCKET}").Content

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
	$installPath = "${WORK_DIR}\${baseName}"
	
	echo "Downloading Package: ${zipName}..."
	Start-BitsTransfer $s3Key.AbsoluteUri $zipPath
	
	echo "Extracting Package: ${zipName}..."
	if ($PS_VERSION -lt 5) {
		[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $installPath)
	}
	else {
		Expand-Archive $zipPath -DestinationPath $installPath
	}
	
	echo "Deleting Archive: ${zipName}..."
	Remove-Item $zipPath
	
	echo "Installing Package..."
	cd $installPath
	& .\install.ps1
	cd $WORK_DIR
	
	echo "Deleting Package Install Directory"
	Remove-Item $installPath -Force -Recurse
}

echo "Done!"
