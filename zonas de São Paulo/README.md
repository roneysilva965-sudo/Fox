# Zonas de São Paulo para 6amMart

Este diretório contém uma base pronta para criação de zonas no 6amMart usando os **96 distritos oficiais** do município de São Paulo (SP), agrupados por subprefeitura e macro-região operacional.

## Arquivos

- `zonas_sao_paulo_6ammart.csv`
  - Colunas: `regiao`, `subprefeitura`, `distrito`, `slug_zona`
  - 96 linhas (1 por distrito).
- `zonas_sao_paulo_6ammart.json`
  - Estrutura agrupada por `Região - Subprefeitura`, útil para seeds/importação via script.

## Sugestão de uso no 6amMart

1. Criar as zonas no painel por `subprefeitura` (32 zonas-base) ou por `distrito` (96 zonas detalhadas).
2. Usar `slug_zona` como identificador técnico estável.
3. Se quiser reduzir complexidade inicial, começar por macro-região (`Centro`, `Norte`, `Sul`, `Leste`, `Oeste`) e depois quebrar por subprefeitura.

## Observação

Em São Paulo, o padrão administrativo oficial é por **distritos** (não há uma lista única oficial de bairros para toda a cidade). Por isso, este pacote usa distritos para garantir consistência operacional.
