"""tools/informe/recortar.py — prepara las figuras del informe a partir de docs/capturas/.

Recorta cada captura a la zona que se comenta en el informe y la guarda como JPEG en la carpeta indicada
(por defecto, build/informe/img). Uso: python -I tools/informe/recortar.py [carpeta_de_salida]
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

RAIZ = Path(__file__).resolve().parents[2]
CAP = RAIZ / "docs" / "capturas"
SALIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "build" / "informe" / "img"

# nombre de salida: (archivo de origen, caja (izq, arriba, der, abajo) en px del original o None = sin recorte)
FIGURAS = {
    "arquitectura": ("informe-arquitectura.png", "auto"),
    "figma-galeria": ("figma/galeria.png", (0, 0, 1280, 640)),
    "figma-optimizador": ("figma/optimizador.png", (0, 140, 1280, 1040)),
    "clasificacion": ("sitio/clasificacion-claro.png", (32, 846, 1250, 1590)),
    "regresion": ("sitio/regresion-claro.png", (32, 882, 1250, 1400)),
    "optimizador": ("sitio/optimizador-claro.png", (32, 896, 1250, 1450)),
    "portafolios": ("sitio/portafolios-claro.png", (32, 534, 1250, 1206)),
    "backtesting-curvas": ("sitio/backtesting-claro.png", (32, 840, 1250, 1336)),
    "backtesting-metricas": ("sitio/backtesting-claro.png", (32, 1740, 1250, 2334)),
    "backtesting-real": ("sitio/backtesting-real.png", (32, 886, 1250, 1376)),
    "dashboard-oscuro": ("sitio/dashboard-oscuro.png", (0, 0, 1280, 1100)),
    "centro": ("sitio/centro-accesibilidad.jpg", None),
    "movil-portafolios": ("sitio/portafolios-390.jpg", None),
    "movil-clasificacion": ("sitio/clasificacion-390-oscuro.jpg", None),
    "barrido": ("sitio/barrido.png", (0, 0, 1280, 900)),
}
ANCHO_MAX = 1400  # px: suficiente para 16 cm a unos 220 ppp


def recorte_automatico(im):
    """Quita el margen blanco alrededor del contenido."""
    fondo = Image.new(im.mode, im.size, (255, 255, 255))
    caja = ImageChops.difference(im, fondo).getbbox()
    if not caja:
        return im
    m = 16
    return im.crop((max(0, caja[0] - m), max(0, caja[1] - m), min(im.width, caja[2] + m), min(im.height, caja[3] + m)))


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, (origen, caja) in FIGURAS.items():
        im = Image.open(CAP / origen).convert("RGB")
        if caja == "auto":
            im = recorte_automatico(im)
        elif caja:
            im = im.crop(caja)
        if im.width > ANCHO_MAX:
            im = im.resize((ANCHO_MAX, round(im.height * ANCHO_MAX / im.width)), Image.LANCZOS)
        im.save(SALIDA / f"{nombre}.jpg", "JPEG", quality=88, optimize=True)
        print(f"{nombre}: {im.width}x{im.height}")


if __name__ == "__main__":
    main()
