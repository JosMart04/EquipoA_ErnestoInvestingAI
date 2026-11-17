# Descarga los modelos de MediaPipe que usa el control por cámara (PLAN_MAESTRO §9.5, D-19).
# Ya están en el repo (assets/mediapipe/); este script solo sirve para volver a obtenerlos o verificarlos.
# Uso, desde la raíz del repo:  powershell -File tools\descargar_modelos.ps1
$ErrorActionPreference = "Stop"
$destino = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\mediapipe"
New-Item -ItemType Directory -Force $destino | Out-Null
$modelos = @(
  @{ nombre = "face_landmarker.task"; url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"; sha256 = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff" },
  @{ nombre = "hand_landmarker.task"; url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"; sha256 = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1" }
)
foreach ($m in $modelos) {
  $ruta = Join-Path $destino $m.nombre
  if (-not (Test-Path $ruta)) { Write-Host "Descargando $($m.nombre)…"; Invoke-WebRequest -Uri $m.url -OutFile $ruta -UseBasicParsing }
  $hash = (Get-FileHash $ruta -Algorithm SHA256).Hash.ToLower()
  if ($hash -ne $m.sha256) { throw "SHA-256 inesperado en $($m.nombre): $hash" }
  Write-Host "OK  $($m.nombre)  $hash"
}
