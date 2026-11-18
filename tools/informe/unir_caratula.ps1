# tools/informe/unir_caratula.ps1 — une la carátula del curso con el cuerpo del informe y exporta DOCX y PDF con Microsoft Word.
# Uso: powershell -File tools/informe/unir_caratula.ps1 -Caratula <caratula.docx> -Cuerpo <cuerpo.docx> -Salida docs/informe/S13_EquipoA_Informe
# La carátula no se modifica (se trabaja sobre una copia en memoria) salvo el subtítulo, que pasa de «Avance» a «Informe».
param(
  [Parameter(Mandatory = $true)][string]$Caratula,
  [Parameter(Mandatory = $true)][string]$Cuerpo,
  [Parameter(Mandatory = $true)][string]$Salida
)
$ErrorActionPreference = "Stop"
$Caratula = (Resolve-Path $Caratula).Path
$Cuerpo = (Resolve-Path $Cuerpo).Path
$Salida = [System.IO.Path]::GetFullPath($Salida)
New-Item -ItemType Directory -Force (Split-Path $Salida) | Out-Null

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  # Abierto como solo lectura: Word no toca el archivo original
  $doc = $word.Documents.Open($Caratula, $false, $true)

  # Subtítulo de la carátula: es el informe, no el avance
  $buscar = $doc.Content.Find
  [void]$buscar.Execute("Avance del proyecto", $true, $false, $false, $false, $false, $true, 0, $false, "Informe del proyecto", 2)

  # La carátula ya termina con un salto de página: se agrega un párrafo nuevo (para no alterar el formato del
  # último integrante) y ahí se inserta el cuerpo. Los estilos de la carátula ganan; el cuerpo trae formato directo.
  $doc.Content.InsertParagraphAfter()
  $r = $doc.Paragraphs.Last.Range
  $r.InsertFile($Cuerpo)

  # La carátula no lleva número de página; el resto sí (pie de la carátula con el campo PAGE)
  $doc.Sections.Item(1).PageSetup.DifferentFirstPageHeaderFooter = -1

  # Índice y campos actualizados
  foreach ($indice in $doc.TablesOfContents) { $indice.Update() }
  [void]$doc.Fields.Update()
  # Propiedades del documento (con enlace tardío: PowerShell no las expone directamente)
  $props = $doc.BuiltInDocumentProperties
  foreach ($par in @(@("Title", "S13_EquipoA_Informe · Ernesto Investing AI"), @("Author", "Equipo A · IHC 2026-II · FISI-UNMSM"))) {
    $prop = [System.__ComObject].InvokeMember("Item", "GetProperty", $null, $props, @($par[0]))
    [void][System.__ComObject].InvokeMember("Value", "SetProperty", $null, $prop, @($par[1]))
  }

  # Times New Roman está en todos los equipos: sin fuentes incrustadas el DOCX pesa mucho menos
  $doc.EmbedTrueTypeFonts = $false
  $doc.SaveAs2("$Salida.docx", 16)
  $doc.ExportAsFixedFormat("$Salida.pdf", 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)
  Write-Output ("paginas: " + $doc.ComputeStatistics(2))
  $doc.Close([ref]0)
} finally {
  $word.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
