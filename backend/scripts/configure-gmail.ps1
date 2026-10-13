$ErrorActionPreference = 'Stop'

$backendDirectory = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $backendDirectory '.env'
$email = (Read-Host 'Gmail address used to send login codes').Trim()
if ($email -notmatch '^[^\s@]+@gmail\.com$') {
  throw 'Enter a valid Gmail address.'
}

$securePassword = Read-Host 'Google 16-character App Password (input is hidden)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) -replace '\s', ''
  if ($appPassword.Length -ne 16) {
    throw 'The App Password should contain 16 characters. Generate it from your Google Account; do not use your normal Gmail password.'
  }

  if (Test-Path $envPath) {
    $lines = [System.Collections.Generic.List[string]]::new()
    [System.IO.File]::ReadAllLines($envPath) | ForEach-Object { $lines.Add($_) }
  } else {
    $lines = [System.Collections.Generic.List[string]]::new()
  }

  $settings = [ordered]@{
    EMAIL_PROVIDER = 'smtp'
    SMTP_HOST = 'smtp.gmail.com'
    SMTP_PORT = '465'
    SMTP_USER = $email
    SMTP_PASS = $appPassword
    MAIL_FROM = "`"Lanka Women E-Market <$email>`""
  }

  foreach ($key in $settings.Keys) {
    $pattern = "^\s*$key\s*=.*$"
    $matches = @($lines | Where-Object { $_ -match $pattern })
    if ($matches.Count -gt 0) {
      for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match $pattern) {
          $lines[$index] = "$key=$($settings[$key])"
        }
      }
    } else {
      $lines.Add("$key=$($settings[$key])")
    }
  }

  [System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Gmail SMTP settings saved to backend/.env. The App Password was not displayed.'
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $appPassword = $null
  $securePassword.Dispose()
}

Push-Location $backendDirectory
try {
  npm run test-email -- $email
  if ($LASTEXITCODE -ne 0) {
    throw 'SMTP test failed. Review the error above; do not share your App Password.'
  }
} finally {
  Pop-Location
}
