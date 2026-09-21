# Diretório de Binários de Inferência ARIA

Este diretório armazena os binários nativos de inferência para Windows (ex: `llama.exe`).

### Resolução de Executáveis:
O orquestrador `electron/llmEngine.cjs` resolve o binário seguindo a ordem de precedência:
1. `<appPath>/resources/bin/llama.exe` (desenvolvimento ou empacotado portátil)
2. `<process.resourcesPath>/bin/llama.exe` (produção instalada via NSIS)
3. `llama.exe` no PATH do sistema / WindowsApps do usuário
