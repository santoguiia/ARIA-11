# Especificação de Design: Motor Multimodal Local Qwen2-VL para OCR, Justificativas e Minutas

**Data:** 2026-09-20  
**Projeto:** ARIA Desktop - Quality Gate de Óbito (REF-11 / INE5448)  
**Status:** Aprovado para Planejamento  

---

## 1. Visão Geral e Objetivos

O objetivo deste subsistema é unificar e modernizar todas as funcionalidades baseadas em Inteligência Artificial no ARIA Desktop, executando de ponta a ponta em modo local-first (on-device) através do modelo de Visão e Linguagem **Qwen2-VL-2B-Instruct** acompanhado do seu projetor multimodal **mmproj (f16)** via `llama.exe serve`.

### Principais Diretrizes:
1. **OCR Multimodal Real de Documentos Físicos:** Processamento direto dos pixels brutos de Declarações de Óbito (D.O.), suportando documentos rotacionados, rasurados, amassados ou carimbados.
2. **Permanência em Memória (Sem Auto-Unload):** Conforme requisito explícito do operador, o servidor LLM permanece ativo durante toda a execução da aplicação para garantir respostas imediatas (latência zero de inicialização subsequente), sendo encerrado unicamente ao fechar a aplicação (`before-quit` / `window-all-closed`).
3. **Privacidade e LGPD:** 100% offline, sem envio de dados ou imagens a provedores de nuvem externos.
4. **Unificação dos Serviços de IA:** OCR, Justificativa Registral (Lei 6.015/73) e Redação de Minutas Oficiais operam sobre o mesmo motor.

---

## 2. Arquitetura e Ciclo de Vida do Motor (`LocalLLMEngine`)

### 2.1 Binário e Modelos
- **Executável:** `llama.exe` (localizado no sistema ou em `resources/bin/llama.exe`).
- **Modelo LLM:** `resources/models/Qwen2-VL-2B-Instruct-Q4_K_M.gguf`.
- **Projetor Multimodal (Vision):** `resources/models/mmproj-Qwen2-VL-2B-Instruct-f16.gguf`.

### 2.2 Comando de Inicialização do Servidor
O Electron inicia e gerencia o `llama.exe serve` em `127.0.0.1:8089`:
```bash
llama.exe serve \
  -m "<caminho_modelo>/Qwen2-VL-2B-Instruct-Q4_K_M.gguf" \
  --mmproj "<caminho_modelo>/mmproj-Qwen2-VL-2B-Instruct-f16.gguf" \
  --port 8089 \
  -c 4096 \
  --image-min-tokens 1024 \
  -ngl 99
```

### 2.3 Gerenciamento de Processo
- **Startup:** Iniciado na primeira chamada (`ensureServerRunning`) ou no boot do Electron.
- **Persistência:** Mantido ativo durante toda a sessão (sem timeout de inatividade e sem descarregamento automático de RAM).
- **Cleanup:** `tree-kill` garantido nos eventos `before-quit`, `window-all-closed` e `process.on('exit')`.
- **Healthcheck:** Consulta `/health` antes de disparar requisições.

---

## 3. Serviços de IA Unificados

### 3.1 OCR Multimodal (`extractDocument`)
- **Entrada:** `imageBase64` (imagem PNG/JPEG ou fac-símile renderizado de PDF) e metadados opcionais.
- **Chamada:** `POST http://127.0.0.1:8089/v1/chat/completions`
- **Formato Multimodal:**
  ```json
  {
    "model": "qwen2-vl",
    "messages": [
      {
        "role": "system",
        "content": "Você é um perito em análise visual de documentos de Registro Civil brasileiro..."
      },
      {
        "role": "user",
        "content": [
          { "type": "text", "text": "Extraia todos os campos da Declaração de Óbito em JSON estrito..." },
          { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
        ]
      }
    ],
    "temperature": 0.1,
    "max_tokens": 1500
  }
  ```
- **Saída:** Objeto estruturado compatível com `DeathRecordData`, lista de campos com Bounding Boxes normalizadas `[ymin, xmin, ymax, xmax]` e classificação de conformidade documental.

### 3.2 Justificativa Registral (`generateJustification`)
- Gera despacho fundamentado formal nos termos da Lei 6.015/73 e Provimento CNJ 149 para apontamentos de divergência no Quality Gate.
- Utiliza a rota `/v1/chat/completions` com prompt textual e baixa temperatura (0.2).

### 3.3 Minuta Oficial do Assento (`draftMinuta`)
- Redige o termo oficial solene do Livro C com dados qualificadores, atestado médico e anotações do Quality Gate.

---

## 4. Ponte IPC e Integração de Frontend

### 4.1 Electron IPC Handlers (`electron/main.cjs` e `electron/preload.cjs`)
- `llm:process-ocr` -> chama `llmEngine.processOCR({ imageBase64, mimeType, fileName })`
- `llm:generate-justification` -> chama `llmEngine.generateJustification(params)`
- `llm:draft-minuta` -> chama `llmEngine.draftMinuta(params)`
- `llm:get-status` -> retorna status do processo `llama.exe` (PID, porta, modelo carregado, status de conexão).

### 4.2 Frontend Pipeline (`src/engine/ocrPipeline.ts`)
- `processUploadedOCRFile`:
  1. Converte PDF ou imagem para Base64.
  2. Verifica disponibilidade do Electron IPC (`window.electronAPI?.llm?.processOCR`).
  3. Se em ambiente Web (dev), consome `/api/vision-ocr` no `server.ts` que faz proxy reverso para o servidor local `http://127.0.0.1:8089`.
  4. Mapeia campos extraídos, confiança e Bounding Boxes para o estado do documento (`OCRDocumentState`).
  5. Fallback automático caso o servidor esteja indisponível.

### 4.3 Servidor de Desenvolvimento (`server.ts`)
- Atualiza `/api/vision-ocr` e `/api/llm/justification` para comunicar diretamente com o `llama-server` local na porta 8089, removendo a dependência de chave externa do Google Gemini.

---

## 5. Plano de Verificação e Testes
1. **Teste Unitário/Script de Inicialização:** Iniciar o `llama.exe serve` com os modelos GGUF e mmproj e validar a resposta de `/health`.
2. **Teste de Inferência Multimodal:** Enviar uma imagem de teste para `/v1/chat/completions` e validar a recepção do JSON estruturado com os campos da D.O.
3. **Teste de Persistência:** Confirmar que após 5 minutos o processo não é finalizado e continua respondendo sem reinicialização.
4. **Teste de Encerramento Limpo:** Fechar o app e verificar no Gerenciador de Tarefas do Windows que nenhum processo órfão de `llama.exe` permaneceu ativo.
5. **Verificação dos Tipos TypeScript:** Executar `npm run lint` para garantir integridade do frontend.
