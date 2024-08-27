$foldersToInclude = @("src", "public")
$outputFile = "estrutura_projeto.txt"

function Generate-Structure {
    param (
        [string]$dir,
        [int]$level = 0
    )

    $items = Get-ChildItem -Path $dir

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            if ($foldersToInclude -contains $item.Name -or $level -gt 0) {
                $indent = "  " * $level
                Add-Content -Path $outputFile -Value "$indent- $($item.Name)"
                Generate-Structure -dir $item.FullName -level ($level + 1)
            }
        } else {
            $indent = "  " * $level
            Add-Content -Path $outputFile -Value "$indent- $($item.Name)"
        }
    }
}

# Limpar arquivo anterior
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Iniciar geração da estrutura
Add-Content -Path $outputFile -Value "# Estrutura do Projeto"
Generate-Structure -dir (Get-Location)
Write-Output "Estrutura do projeto salva em $outputFile"
