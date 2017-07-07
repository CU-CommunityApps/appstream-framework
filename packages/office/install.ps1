# MS PowerShell

$KMS_SERVER = 'kms02.cit.cornell.edu'
$ISO_OFFICE = "office.iso"

Mount-DiskImage -ImagePath $ISO_OFFICE -StorageType ISO
$isodrive = (Get-DiskImage -ImagePath $ISO_OFFICE | Get-Volume).DriveLetter

echo "MS Office ISO Mounted at: ${isodrive}:"
echo "Installing MS Office..."

$result = & ${isodrive}:\setup.exe /adminfile cu_office_config.msp | Out-String

echo $result

$officePath = (Get-ItemProperty "hklm:\software\microsoft\windows\currentversion\app paths\WINWORD.EXE").Path
echo "MS Office Installed to: $officePath"

echo "Activating MS Office..."
$result = & cscript ${officePath}ospp.vbs /sethst:$KMS_SERVER | Out-String
echo $result
$result = & cscript ${officePath}ospp.vbs /act

echo "Unmounting MS Office ISO"
Dismount-DiskImage -ImagePath $ISO_OFFICE

echo "Completed Install of MS Office!"
