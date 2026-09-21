# ARIA Desktop - Modelos GGUF Locais Embutidos

Este diretório contém os pesos quantizados de modelos de linguagem (LLM) executados localmente via `node-llama-cpp`.

### Modelo Padrão:
* **Arquivo:** `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf`
* **Arquitetura:** Qwen 2.5 (1.5B parâmetros)
* **Quantização:** Q4_K_M (Otimizado para CPUs x64 modernas e GPUs integradas/dedicadas)
* **Limite de Contexto:** 2048 tokens
* **Liberação de Memória:** Descarregamento automático da RAM/VRAM após 3 minutos sem chamadas.

### Empacotamento Windows (Electron Builder):
O instalador Windows (`electron-builder.json`) copia este diretório como `extraResource` para:
* **Ambiente de Desenvolvimento:** `<appPath>/resources/models/`
* **Ambiente de Produção:** `<process.resourcesPath>/models/`

Isso garante que o arquivo binário `.gguf` não seja compactado no arquivo `.asar`, permitindo mapeamento de memória (*mmap*) de alta velocidade pelo executável nativo.
