# ARIA Desktop - Modelos GGUF Multimodais Locais Embutidos

Este diretório contém os pesos quantizados de modelos de visão e linguagem (VLM/LLM) executados localmente via `llama.exe serve` (multimodal mtmd).

### Modelo Padrão:
* **Arquivo Base (LLM):** `Qwen2-VL-2B-Instruct-Q4_K_M.gguf`
* **Projetor Multimodal (Vision):** `mmproj-Qwen2-VL-2B-Instruct-f16.gguf`
* **Arquitetura:** Qwen 2 VL (Vision-Language, 2.2B parâmetros)
* **Quantização:** Q4_K_M (LLM) + F16 (Vision Projector)
* **Capacidade:** Leitura óptica direta de pixels (OCR multimodal para documentos rotacionados, rasurados, amassados e carimbados) + Raciocínio Jurídico Registral (Justificativas e Minutas).
* **Limite de Contexto:** 4096 tokens (com mínimo de 1024 tokens reservados para grounding visual de imagens).
* **Política de Execução:** Permanece carregado em memória durante a sessão da aplicação para resposta imediata, sendo encerrado apenas ao fechar o ARIA Desktop.

### Empacotamento Windows (Electron Builder):
O instalador Windows (`electron-builder.json`) copia este diretório como `extraResource` para:
* **Ambiente de Desenvolvimento:** `<appPath>/resources/models/`
* **Ambiente de Produção:** `<process.resourcesPath>/models/`

Isso garante que os arquivos binários `.gguf` não sejam compactados no arquivo `.asar`, permitindo mapeamento de memória (*mmap*) de alta velocidade pelo executável nativo com aceleração de GPU (CUDA).
