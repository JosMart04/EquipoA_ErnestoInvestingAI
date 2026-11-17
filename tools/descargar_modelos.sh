#!/usr/bin/env bash
# Descarga los modelos de MediaPipe que usa el control por cámara (PLAN_MAESTRO §9.5, D-19).
# Ya están en el repo (assets/mediapipe/); este script solo sirve para volver a obtenerlos o verificarlos.
# Uso, desde la raíz del repo:  bash tools/descargar_modelos.sh
set -euo pipefail
destino="$(cd "$(dirname "$0")/.." && pwd)/assets/mediapipe"
mkdir -p "$destino"
base="https://storage.googleapis.com/mediapipe-models"
descargar() { # nombre, ruta en el bucket, sha256
  local ruta="$destino/$1"
  [ -f "$ruta" ] || { echo "Descargando $1…"; curl -fsSL -o "$ruta" "$base/$2"; }
  local hash; hash="$(sha256sum "$ruta" | cut -d' ' -f1)"
  [ "$hash" = "$3" ] || { echo "SHA-256 inesperado en $1: $hash" >&2; exit 1; }
  echo "OK  $1  $hash"
}
descargar face_landmarker.task face_landmarker/face_landmarker/float16/1/face_landmarker.task 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
descargar hand_landmarker.task hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1
