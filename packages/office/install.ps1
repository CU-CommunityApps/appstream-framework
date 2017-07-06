# MS PowerShell

$isoimg = "office.iso"

Mount-DiskImage -ImagePath $isoimg -StorageType ISO
$isodrive = (Get-DiskImage -ImagePath $isoimg | Get-Volume).DriveLetter

echo "${isoimg} Mounted at: ${isodrive}:"
echo "Installing MS Office..."

$result = & ${isodrive}:\setup.exe /adminfile cu_office_config.MSP | Out-String

echo $result

$officePath = (Get-ItemProperty "hklm:\software\microsoft\windows\currentversion\app paths\WINWORD.EXE").Path
echo "MS Office Installed to: $officePath"

echo "Activating MS Office..."
$result = & cscript ${officePath}ospp.vbs /sethst:kms02.cit.cornell.edu | Out-String
echo $result
$result = & cscript ${officePath}ospp.vbs /act

echo "Unmounting $isoimg"
Dismount-DiskImage -ImagePath $isoimg

echo "Completed Install of MS Office!"
