# Motor Multimodal Local Qwen2-VL para OCR, Justificativas e Minutas - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o motor de inferência multimodal local baseado em `Qwen2-VL-2B-Instruct` + `mmproj` gerenciado pelo Electron via `llama.exe serve`, fornecendo OCR multimodal nativo para documentos físicos de óbito, geração de justificativas registrais e redação de minutas oficiais, 100% offline e sem auto-unload durante a execução.

**Architecture:** O processo Electron gerencia o ciclo de vida de um servidor local `llama.exe serve` na porta `127.0.0.1:8089` com aceleração de GPU e o projetor de visão `mmproj`. O backend expõe handlers IPC (`llm:process-ocr`, `llm:generate-justification`, `llm:draft-minuta`), consumidos diretamente pelo frontend e pelo pipeline de OCR, mantendo o processo permanentemente em memória durante a sessão.

**Tech Stack:** Electron (CJS/Node.js), `llama.exe serve` (multimodal mtmd), Qwen2-VL (GGUF Q4_K_M + mmproj f16), React 19, TypeScript, Express (dev server).

**Spec:** `docs/superpowers/specs/2026-09-20-qwen2-vl-multimodal-llm-ocr-design.md`

## Global Constraints
- Modelo GGUF: `resources/models/Qwen2-VL-2B-Instruct-Q4_K_M.gguf`
- Projetor de Visão: `resources/models/mmproj-Qwen2-VL-2B-Instruct-f16.gguf`
- Sem auto-unload: o processo LLM NUNCA deve ser encerrado por inatividade para economizar RAM durante o funcionamento do app
- Encerramento estrito: o processo filho do `llama.exe` deve ser finalizado com `tree-kill` no fechamento do app
- 100% offline / LGPD compliance: sem chamadas para APIs de nuvem externas

---

### Task 1: Atualização de Metadados e Localização do Executável `llama.exe`

**Files:**
- Modify: `resources/models/model-info.json`
- Modify: `resources/models/README.md`
- Create: `resources/bin/README.md`

**Interfaces:**
- Produz metadados sincronizados do modelo Qwen2-VL e diretório de binários do sistema.

- [ ] **Step 1: Atualizar `resources/models/model-info.json` com os dados do Qwen2-VL e mmproj**
- [ ] **Step 2: Atualizar `resources/models/README.md` documentando o projetor multimodal**
- [ ] **Step 3: Criar documentação em `resources/bin/README.md` sobre a descoberta de `llama.exe`**
- [ ] **Step 4: Commit dos metadados**

---

### Task 2: Implementação do Orquestrador Multimodal `LocalLLMEngine` em `electron/llmEngine.cjs`

**Files:**
- Modify: `electron/llmEngine.cjs`
- Create: `electron/test-multimodal.cjs`

**Interfaces:**
- Consumes: Modelos GGUF e mmproj em `resources/models/`, executável `llama.exe`
- Produzes: Classe `LocalLLMEngine` com métodos `ensureServerRunning()`, `processOCR({ imageBase64, mimeType })`, `generateJustification(params)`, `draftMinuta(params)`, `getStatus()`, `shutdown()`

- [ ] **Step 1: Escrever teste de verificação `electron/test-multimodal.cjs`**
- [ ] **Step 2: Executar o teste para verificar falha inicial**
- [ ] **Step 3: Implementar o novo `LocalLLMEngine` em `electron/llmEngine.cjs` com:**
  - Descoberta dinâmica de `llama.exe` (em `resources/bin`, `resourcesPath`, ou PATH)
  - Spawning do `llama.exe serve -m <model> --mmproj <mmproj> --port 8089 -c 4096 --image-min-tokens 1024 -ngl 99`
  - Checagem de `/health` com polling assíncrono (até 15 segundos)
  - Chamadas a `/v1/chat/completions` com parser JSON robusto para extração de entidades e Bounding Boxes
  - Chamadas textuais para Justificativas e Minuta
  - Shutdown limpo via `tree-kill` (SEM timer de inatividade)
- [ ] **Step 4: Executar o teste `electron/test-multimodal.cjs` e verificar sucesso**
- [ ] **Step 5: Commit das mudanças do motor LLM**

---

### Task 3: Atualização da Ponte IPC no Electron (`main.cjs` e `preload.cjs`)

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `LocalLLMEngine` da Task 2
- Produzes: `window.electronAPI.llm.processOCR`, `generateJustification`, `draftMinuta`, `getStatus`

- [ ] **Step 1: Atualizar `src/types.ts` adicionando `processOCR` e `LLMOCRResult` na tipagem global**
- [ ] **Step 2: Atualizar `electron/preload.cjs` expondo `processOCR`**
- [ ] **Step 3: Atualizar `electron/main.cjs`:**
  - Registrar handler IPC `llm:process-ocr`
  - Conectar cleanup no `app.on('before-quit')` e `app.on('window-all-closed')`
- [ ] **Step 4: Executar `npm run lint` para verificar tipagens**
- [ ] **Step 5: Commit da camada IPC**

---

### Task 4: Integração do Pipeline de OCR e Cliente LLM no Frontend

**Files:**
- Modify: `src/engine/llmClient.ts`
- Modify: `src/engine/ocrPipeline.ts`
- Modify: `server.ts`

**Interfaces:**
- Consumes: `window.electronAPI.llm.processOCR` e endpoint `/api/vision-ocr`
- Produzes: `processUploadedOCRFile` utilizando visão multimodal local

- [ ] **Step 1: Atualizar `src/engine/llmClient.ts` implementando `requestLLMOCR`**
- [ ] **Step 2: Atualizar `server.ts`:**
  - Redirecionar `/api/vision-ocr` para o `http://127.0.0.1:8089/v1/chat/completions` local
  - Redirecionar `/api/llm/justification` para o servidor local
  - Remover dependência obrigatória de chave externa do Google Gemini
- [ ] **Step 3: Atualizar `src/engine/ocrPipeline.ts`:**
  - No fluxo de processamento de imagem/PDF, chamar o motor multimodal (via IPC se Electron ou via API local)
  - Extrair campos, confiança e Bounding Boxes
- [ ] **Step 4: Validar build com `npm run lint` e `npm run build`**
- [ ] **Step 5: Commit da integração frontend/servidor**

---

### Task 5: Validação Completa do Sistema e Documentação de Entrega

**Files:**
- Modify: `src/components/AboutModal.tsx` ou badges de LLM se aplicável
- Create: `walkthrough.md`

- [ ] **Step 1: Executar teste de ponta a ponta com fac-símile de D.O. e verificar resposta do Qwen2-VL**
- [ ] **Step 2: Validar geração de justificativa e minuta oficial via LLM**
- [ ] **Step 3: Verificar que o processo permanece em execução (sem unload) durante a sessão**
- [ ] **Step 4: Gerar walkthrough final**
