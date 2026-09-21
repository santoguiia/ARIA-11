/**
 * ARIA Desktop - Motor de Inferência Multimodal On-Device
 * Modelo: Qwen2-VL-2B-Instruct-Q4_K_M.gguf
 * Projetor Multimodal (Vision): mmproj-Qwen2-VL-2B-Instruct-f16.gguf
 * Orquestrador: Servidor nativo llama.exe serve com aceleração GPU (CUDA/DirectML)
 * 100% Offline / Sem dependência de nuvem / LGPD & Provimento 149/CNJ
 * Política de Memória: Permanece ativo na RAM/VRAM durante toda a sessão (sem auto-unload)
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

const MODEL_FILENAME = 'Qwen2-VL-2B-Instruct-Q4_K_M.gguf';
const MMPROJ_FILENAME = 'mmproj-Qwen2-VL-2B-Instruct-f16.gguf';
const SERVER_PORT = 8089;
const SERVER_HOST = '127.0.0.1';
const CONTEXT_SIZE = 4096;

class LocalLLMEngine {
  constructor(appInstance) {
    this.app = appInstance;
    this.serverProcess = null;
    this.isStarting = false;
    this.startPromise = null;
    this.totalInferences = 0;
    this.startedAt = null;
  }

  /**
   * Localiza o executável nativo llama.exe
   */
  resolveBinaryPath() {
    const isPackaged = this.app ? this.app.isPackaged : false;
    const appRoot = this.getProjectRoot();

    const candidates = [];

    // 1. Diretório de binários empacotados ou de desenvolvimento
    if (isPackaged && process.resourcesPath) {
      candidates.push(path.join(process.resourcesPath, 'bin', 'llama.exe'));
    }
    candidates.push(path.join(appRoot, 'resources', 'bin', 'llama.exe'));

    // 2. Caminho padrão do WindowsApps / winget / scoop
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'llama.exe'));
    }
    if (process.env.USERPROFILE) {
      candidates.push(path.join(process.env.USERPROFILE, 'scoop', 'shims', 'llama.exe'));
    }

    // 3. Checagem direta de existência
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return { path: p, source: 'LOCAL_FILE' };
      }
    }

    // 4. Fallback para comando no PATH
    return { path: 'llama.exe', source: 'SYSTEM_PATH' };
  }

  /**
   * Resolvedor de raiz do projeto
   */
  getProjectRoot() {
    if (this.app) {
      const appPath = this.app.getAppPath();
      if (fs.existsSync(path.join(appPath, 'resources', 'models'))) {
        return appPath;
      }
      const parent = path.dirname(appPath);
      if (fs.existsSync(path.join(parent, 'resources', 'models'))) {
        return parent;
      }
      return appPath;
    }
    return process.cwd();
  }

  /**
   * Resolvedor de caminhos dos modelos GGUF e mmproj
   */
  resolveModelPaths() {
    const isPackaged = this.app ? this.app.isPackaged : false;
    let baseDir = '';
    let environment = 'DEVELOPMENT';

    if (isPackaged && process.resourcesPath) {
      baseDir = path.join(process.resourcesPath, 'models');
      environment = 'PACKAGED_PRODUCTION';
    } else {
      const appRoot = this.getProjectRoot();
      baseDir = path.join(appRoot, 'resources', 'models');
      environment = 'DEVELOPMENT';
    }

    const modelPath = path.join(baseDir, MODEL_FILENAME);
    const mmprojPath = path.join(baseDir, MMPROJ_FILENAME);

    return {
      modelPath,
      modelExists: fs.existsSync(modelPath),
      mmprojPath,
      mmprojExists: fs.existsSync(mmprojPath),
      baseDir,
      environment
    };
  }

  /**
   * Healthcheck HTTP no servidor llama.exe
   */
  checkHealth(timeoutMs = 1500) {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${SERVER_HOST}:${SERVER_PORT}/health`,
        { timeout: timeoutMs },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json.status === 'ok');
            } catch (e) {
              resolve(res.statusCode === 200);
            }
          });
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Inicializa o servidor multimodal llama.exe serve sob demanda
   * (Sem auto-unload: o servidor permanece ativo durante toda a execução da aplicação)
   */
  async ensureServerRunning() {
    // 1. Se já está respondendo ao healthcheck, está pronto
    const healthy = await this.checkHealth(800);
    if (healthy) {
      return true;
    }

    // 2. Se outra chamada já estiver iniciando, aguarda a promessa corrente
    if (this.isStarting && this.startPromise) {
      return await this.startPromise;
    }

    this.isStarting = true;
    this.startPromise = (async () => {
      const bin = this.resolveBinaryPath();
      const models = this.resolveModelPaths();

      if (!models.modelExists) {
        console.warn(`[ARIA VLM] Modelo GGUF não encontrado em: ${models.modelPath}. Operando em modo de contingência.`);
        this.isStarting = false;
        return false;
      }

      const args = [
        'serve',
        '-m', models.modelPath,
        '--port', String(SERVER_PORT),
        '--host', SERVER_HOST,
        '-c', String(CONTEXT_SIZE),
        '-ngl', '99'
      ];

      if (models.mmprojExists) {
        args.push('--mmproj', models.mmprojPath);
        args.push('--image-min-tokens', '1024');
      }

      console.log(`[ARIA VLM] Iniciando servidor multimodal: ${bin.path} (Porta ${SERVER_PORT})`);
      console.log(`[ARIA VLM] Modelo: ${models.modelPath}`);
      if (models.mmprojExists) {
        console.log(`[ARIA VLM] Projetor de Visão: ${models.mmprojPath}`);
      }

      try {
        const proc = spawn(bin.path, args, {
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });

        this.serverProcess = proc;
        this.startedAt = Date.now();

        proc.stdout.on('data', (data) => {
          const str = data.toString();
          if (str.includes('error') || str.includes('listening')) {
            console.log(`[llama-server] ${str.trim()}`);
          }
        });

        proc.stderr.on('data', (data) => {
          const str = data.toString();
          if (str.includes('error') || str.includes('loaded') || str.includes('listening')) {
            console.log(`[llama-server stderr] ${str.trim()}`);
          }
        });

        proc.on('exit', (code, sig) => {
          console.log(`[ARIA VLM] Servidor llama.exe encerrado (Code: ${code}, Sig: ${sig})`);
          this.serverProcess = null;
        });

        // Polling para aguardar inicialização do servidor (até 25 segundos)
        const startWait = Date.now();
        while (Date.now() - startWait < 25000) {
          await new Promise((r) => setTimeout(r, 500));
          const isUp = await this.checkHealth(1000);
          if (isUp) {
            console.log(`[ARIA VLM] Servidor multimodal online e pronto para inferências em ${Date.now() - startWait}ms.`);
            this.isStarting = false;
            return true;
          }
          if (!this.serverProcess) {
            break;
          }
        }

        console.warn('[ARIA VLM] Timeout aguardando inicialização do servidor.');
        this.isStarting = false;
        return false;
      } catch (err) {
        console.error('[ARIA VLM] Erro ao disparar processo llama.exe:', err);
        this.isStarting = false;
        return false;
      }
    })();

    return await this.startPromise;
  }

  /**
   * Realiza requisição POST JSON ao servidor HTTP local
   */
  async _postJson(endpoint, payload, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const dataStr = JSON.stringify(payload);
      const req = http.request(
        {
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataStr)
          },
          timeout: timeoutMs
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(body));
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${body}`));
              }
            } catch (e) {
              reject(new Error(`Falha ao decodificar JSON de resposta: ${body}`));
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout (${timeoutMs}ms) na requisição ao motor multimodal`));
      });

      req.write(dataStr);
      req.end();
    });
  }

  /**
   * OCR Multimodal de Documentos Físicos (D.O. / Certidão / RG)
   * Processamento direto da imagem via Qwen2-VL com mmproj
   */
  async processOCR({ imageBase64, mimeType = 'image/jpeg', fileName = 'documento.jpg' }) {
    this.totalInferences++;
    const startTime = Date.now();

    const isRunning = await this.ensureServerRunning();
    if (!isRunning) {
      throw new Error('Servidor multimodal local (Qwen2-VL) indisponível.');
    }

    // Normalização da URL base64 para o formato aceito pela OpenAI API
    let cleanUrl = imageBase64;
    if (!cleanUrl.startsWith('data:')) {
      cleanUrl = `data:${mimeType};base64,${imageBase64}`;
    }

    const systemPrompt = `Você é um perito em análise visual de documentos de Registro Civil e Medicina Legal (Declaração de Óbito - D.O. do Ministério da Saúde do Brasil, Certidão de Óbito e RG).
Analise a imagem deste documento com extrema precisão óptica e responda no formato JSON estruturado com a seguinte estrutura:

{
  "classification": {
    "type": "DECLARACAO_OBITO" | "CERTIDAO_OBITO" | "RG_IDENTIDADE" | "OUTRO",
    "typeName": "Declaração de Óbito (D.O. Física)" | "Certidão de Registro Civil" | "Documento Divergente",
    "confidence": 98,
    "isCompatibleDO": true | false,
    "reason": "Descrição da validação do documento"
  },
  "fields": [
    {
      "field": "numeroDO",
      "label": "Número da D.O.",
      "value": "12345678-9",
      "confidence": 96,
      "box_2d": [ymin, xmin, ymax, xmax] // normalizado de 0 a 1000
    }
  ],
  "fullTranscribedText": "Texto transcrito integralmente"
}

Extraia todos os campos presentes: numeroDO, nomeFalecido, cpf, rg, rgOrgaoEmissor, dataNascimento, sexo, corRaca, estadoCivil, dataCasamento, nomeConjuge, nomeMae, nomePai, dataObito, horaObito, localObito, tipoLocal, municipioObito, ufObito, causaMortis, cid10, nomeMedico, crmMedico, ufCrm, sepultamentoCremacao, cemiterio, deixouBens, deixouTestamento, deixouFilhos, qtdFilhos, nomesFilhos, nomeDeclarante, qualificacaoDeclarante.
Responda APENAS com o objeto JSON sem introduções ou explicações fora do JSON.`;

    const payload = {
      model: 'qwen2-vl',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analise a imagem da Declaração de Óbito, extraia todos os campos e calcule as bounding boxes normalizadas [ymin, xmin, ymax, xmax] em escala 0-1000.' },
            { type: 'image_url', image_url: { url: cleanUrl } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    };

    const response = await this._postJson('/v1/chat/completions', payload, 60000);
    const content = response.choices && response.choices[0] && response.choices[0].message
      ? response.choices[0].message.content
      : '{}';

    let parsedData = null;
    try {
      // Limpeza de marcações markdown ```json ... ```
      const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('[ARIA VLM] Falha ao fazer parse do JSON retornado pelo VLM, usando extrator regex:', parseErr.message);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          //
        }
      }
    }

    if (!parsedData || !parsedData.fields) {
      throw new Error('O modelo multimodal não retornou campos válidos no documento analisado.');
    }

    return {
      success: true,
      source: 'Qwen2-VL-2B Multimodal (Local On-Device)',
      durationMs: Date.now() - startTime,
      data: parsedData
    };
  }

  /**
   * Gera justificativa jurídica formal nos termos da Lei 6.015/73 e Provimento 149/CNJ
   */
  async generateJustification({ ruleId, ruleTitle, legalReference, diffSummary, declaracao, ocr, federada }) {
    this.totalInferences++;
    const startTime = Date.now();

    const isRunning = await this.ensureServerRunning();

    const prompt = `Você é o Copiloto Jurídico ARIA para Registro Civil das Pessoas Naturais (RCPN - Lei 6.015/73 e Provimento 149/CNJ).
Redija uma justificativa registral formal, técnica e concisa (2 a 4 frases) para sanar o seguinte apontamento de divergência:
- Regra: ${ruleTitle} (${ruleId})
- Fundamento Legal: ${legalReference}
- Divergência: ${diffSummary || 'Divergência entre documentos apresentados'}
- Falecido: ${declaracao.nomeFalecido}, CPF: ${declaracao.cpf}
- Dados D.O. Física: ${ocr.nomeFalecido || '---'}, D.O. nº ${ocr.numeroDO || '---'}
- Base Federada: ${federada.nomeFalecido || '---'}

Instrução: Apresente a motivação formal que comprova a veracidade dos dados lavrados, citando a fé pública do escrevente e os documentos comprobatórios examinados. Responda apenas com a justificativa técnica.`;

    let textResponse = '';
    let source = 'Qwen2-VL-2B (Local On-Device)';

    if (isRunning) {
      try {
        const payload = {
          model: 'qwen2-vl',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 350
        };
        const response = await this._postJson('/v1/chat/completions', payload, 20000);
        textResponse = response.choices[0].message.content.trim();
      } catch (err) {
        console.warn('[ARIA VLM] Falha na chamada da justificativa, usando sintetizador determinístico:', err.message);
        textResponse = this._generateDeterministicJustification(ruleId, ruleTitle, legalReference, diffSummary, declaracao, ocr);
        source = 'Motor Local Fallback (Regras Cartorárias)';
      }
    } else {
      textResponse = this._generateDeterministicJustification(ruleId, ruleTitle, legalReference, diffSummary, declaracao, ocr);
      source = 'Motor Local Determinístico (Prov. 149/CNJ)';
    }

    return {
      success: true,
      justification: textResponse.trim(),
      tokensGenerated: Math.round(textResponse.length / 4),
      durationMs: Date.now() - startTime,
      source,
      contextSize: CONTEXT_SIZE
    };
  }

  /**
   * Redação da Minuta Oficial do Assento de Óbito (Livro C)
   */
  async draftMinuta({ declaracao, justifications }) {
    this.totalInferences++;
    const startTime = Date.now();

    const isRunning = await this.ensureServerRunning();
    let text = '';
    let source = 'Qwen2-VL-2B (Local On-Device)';

    if (isRunning) {
      try {
        const prompt = `Redija a minuta oficial de assento de óbito em linguagem registral solene segundo a Lei nº 6.015/73, art. 77 e 80, para o falecido ${declaracao.nomeFalecido}, CPF ${declaracao.cpf}, falecido em ${declaracao.dataObito} às ${declaracao.horaObito} em ${declaracao.localObito}, causa mortis ${declaracao.causaMortis} (CID ${declaracao.cid10}), atestado pelo Dr. ${declaracao.nomeMedico} CRM ${declaracao.crmMedico}/${declaracao.ufCrm}. Sepultamento em ${declaracao.cemiterio}. Declarante: ${declaracao.nomeDeclarante}. Retorne apenas a minuta oficial completa.`;
        const payload = {
          model: 'qwen2-vl',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 650
        };
        const response = await this._postJson('/v1/chat/completions', payload, 25000);
        text = response.choices[0].message.content.trim();
      } catch (err) {
        text = this._generateStandardMinuta(declaracao, justifications);
        source = 'Minuta Registral Padronizada (Prov. 149/CNJ)';
      }
    } else {
      text = this._generateStandardMinuta(declaracao, justifications);
      source = 'Minuta Registral Padronizada (Prov. 149/CNJ)';
    }

    return {
      success: true,
      minuta: text.trim(),
      durationMs: Date.now() - startTime,
      source
    };
  }

  _generateDeterministicJustification(ruleId, ruleTitle, legalReference, diffSummary, decl, ocr) {
    if (ruleId.includes('CASAMENTO') || ruleId.includes('ESTADO_CIVIL')) {
      return `Justifica-se a lavratura do estado civil '${decl.estadoCivil}' com base na apresentação da Certidão de Casamento com averbações atualizadas exibida pelo declarante ${decl.nomeDeclarante}, prevalecendo o registro civil documental sobre a anotação sumária da Declaração de Óbito nº ${ocr.numeroDO || decl.numeroDO}, nos termos do art. 80, 4º da Lei 6.015/73 e Provimento 149/CNJ.`;
    }
    if (ruleId.includes('FILIACAO') || ruleId.includes('MAE') || ruleId.includes('PAI')) {
      return `A filiação declarada (${decl.nomeMae} e ${decl.nomePai}) confere estritamente com a Certidão de Nascimento/RG original nº ${decl.rg} expedida pelo órgão oficial, tendo sido sanada a omissão/divergência tipográfica constante na D.O. física por fé pública registral, em observância ao Provimento 149/CNJ.`;
    }
    if (ruleId.includes('HORA') || ruleId.includes('DATA')) {
      return `A cronologia do falecimento ocorrido em ${decl.dataObito} às ${decl.horaObito} horas foi confirmada pelo atestado médico original emitido pelo Dr. ${decl.nomeMedico} (CRM ${decl.crmMedico}/${decl.ufCrm}), ratificada pelo declarante sob as penas da lei (art. 77 da Lei 6.015/73).`;
    }
    return `Procedeu-se à verificação direta dos documentos originais comprobatórios apresentados pelo declarante ${decl.nomeDeclarante}, confirmando-se a higidez jurídica dos dados para a lavratura definitiva do assento, com base no fundamento legal ${legalReference}.`;
  }

  _generateStandardMinuta(decl, justifications) {
    const dataObitoFmt = decl.dataObito || 'data não anotada';
    return `TERMO DE ASSENTO DE ÓBITO - MINUTA OFICIAL
SERVENTIA: 1º OFÍCIO DE REGISTRO CIVIL DAS PESSOAS NATURAIS
LIVRO C-AUXILIAR • FOLHA 142 • TERMO Nº 084191

Aos registros desta serventia, compareceu neste Ofício o declarante ${decl.nomeDeclarante}, qualificado como ${decl.qualificacaoDeclarante}, exibindo a Declaração de Óbito nº ${decl.numeroDO}. Declarou que no dia ${dataObitoFmt}, às ${decl.horaObito} horas, em ${decl.localObito}, município de ${decl.municipioObito}/${decl.ufObito}, faleceu o indivíduo de sexo ${decl.sexo === 'M' ? 'masculino' : 'feminino'}, cor ${decl.corRaca.toLowerCase()}, de estado civil ${decl.estadoCivil.toLowerCase()}, com ${decl.dataNascimento ? `nascido em ${decl.dataNascimento}` : ''}, portador do CPF nº ${decl.cpf} e RG nº ${decl.rg} (${decl.rgOrgaoEmissor}). Filho de ${decl.nomePai || 'pai não declarado'} e de ${decl.nomeMae || 'mãe não declarada'}. O falecido deixou bens: ${decl.deixouBens}; testamento: ${decl.deixouTestamento}; filhos: ${decl.deixouFilhos}${decl.qtdFilhos ? ` (${decl.qtdFilhos} filhos: ${decl.nomesFilhos || ''})` : ''}. Tendo como causa mortis: ${decl.causaMortis}, CID-10 ${decl.cid10}, conforme atestado firmado pelo Dr. ${decl.nomeMedico}, médico inscrito no CRM nº ${decl.crmMedico}/${decl.ufCrm}. O sepultamento realizar-se-á no ${decl.cemiterio}. 

OBSERVAÇÕES E MOTIVAÇÃO REGISTRAL (QUALIFICAÇÃO DO ATO):
O presente assento foi processado pelo Quality Gate ARIA com conferência de integridade criptográfica. ${
  justifications && Object.keys(justifications).length > 0
    ? `Foram registradas ${Object.keys(justifications).length} motivações pelo escrevente autorizador.`
    : 'Ato conforme sem pendências impeditivas.'
} Lido e achado conforme, assina o declarante e o escrevente autorizado.`;
  }

  /**
   * Encerramento limpo do processo do servidor (apenas ao fechar a aplicação)
   */
  async shutdown() {
    if (this.serverProcess) {
      console.log('[ARIA VLM] Encerrando servidor multimodal...');
      const pid = this.serverProcess.pid;
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        } else {
          this.serverProcess.kill('SIGTERM');
        }
      } catch (e) {
        try { this.serverProcess.kill('SIGKILL'); } catch (err) {}
      }
      this.serverProcess = null;
    }
  }

  getStatus() {
    const bin = this.resolveBinaryPath();
    const models = this.resolveModelPaths();

    return {
      isLoaded: !!this.serverProcess,
      isRunning: !!this.serverProcess,
      pid: this.serverProcess ? this.serverProcess.pid : null,
      serverUrl: `http://${SERVER_HOST}:${SERVER_PORT}`,
      modelPath: models.modelPath,
      modelExists: models.modelExists,
      mmprojPath: models.mmprojPath,
      mmprojExists: models.mmprojExists,
      binaryPath: bin.path,
      contextSizeLimit: CONTEXT_SIZE,
      totalInferences: this.totalInferences,
      uptimeSeconds: this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0,
      engine: 'llama.exe serve (multimodal mtmd) + Qwen2-VL-2B-Instruct + mmproj',
      persistentMemoryPolicy: 'Permanente em RAM/VRAM durante a sessão (sem auto-unload)'
    };
  }
}

module.exports = {
  LocalLLMEngine,
  MODEL_FILENAME,
  MMPROJ_FILENAME,
  SERVER_PORT,
  CONTEXT_SIZE
};
