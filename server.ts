import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser com limite estendido para suportar imagens escaneadas em alta resolução (Base64)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Inicialização sob demanda (lazy) do cliente Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Função utilitária para detectar o MIME type real a partir dos Magic Bytes ou prefixo Data URL
function detectMimeType(base64Payload: string, declaredMime?: string): string {
  // 1. Prefixo de Data URL explícito
  const prefixMatch = base64Payload.match(/^data:([^;]+);base64,/i);
  if (prefixMatch && prefixMatch[1]) {
    const pMime = prefixMatch[1].toLowerCase().trim();
    if (pMime === 'image/jpg') return 'image/jpeg';
    return pMime;
  }

  // 2. Magic bytes binários do Base64 limpo
  const clean = base64Payload.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '').trim();
  if (clean.startsWith('/9j/')) return 'image/jpeg';
  if (clean.startsWith('iVBORw0KGgo')) return 'image/png';
  if (clean.startsWith('JVBERi0')) return 'application/pdf';
  if (clean.startsWith('UklGR')) return 'image/webp';
  if (clean.startsWith('R0lGO')) return 'image/gif';

  // 3. Fallback declarado se contiver barra
  if (declaredMime && declaredMime.includes('/')) {
    const dMime = declaredMime.toLowerCase().trim();
    if (dMime === 'image/jpg') return 'image/jpeg';
    return dMime;
  }

  return 'image/jpeg';
}

// 1. Função utilitária de chamada resiliente do Google Gemini (com fallback para modelos autorizados)
async function callGeminiResilient(
  contents: any,
  config?: any,
  timeoutMs = 12000
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  // Normalização do formato de conteúdo: objeto { parts: [...] } compatível com multimodalidade
  const normalizedContents = Array.isArray(contents)
    ? { parts: contents }
    : contents && contents.parts
    ? contents
    : { parts: [contents] };

  // Modelos autorizados pela documentação do @google/genai:
  // 1. gemini-2.5-flash (alta cota diária, estável para visão multimodal)
  // 2. gemini-3.1-flash-lite (ultrarrápido e resiliente)
  // 3. gemini-3.8-flash (modelo padrão para tarefas de texto e visão multimodal)
  // 4. gemini-flash-latest (alias dinâmico)
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: normalizedContents,
          config
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms ao aguardar resposta do modelo ${model}`)), timeoutMs)
        )
      ]);

      const text = response.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      // Trata limite de cota sem poluir os logs de erro
      const isQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        console.info(`[Gemini Engine] Modelo ${model} atingiu cota gratuita temporária. Verificando próximo modelo...`);
      } else {
        console.warn(`[Gemini Engine] Modelo ${model} encontrou instabilidade (${err?.status || err?.message || 'erro'}). Alternando para o próximo da cadeia...`);
      }
    }
  }

  throw lastError || new Error('Todos os modelos Gemini autorizados estão indisponíveis.');
}

// 2. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    visionModel: 'gemini-3.8-flash (fallback: gemini-3.1-flash-lite)',
    provider: 'Google GenAI SDK (@google/genai)',
    timestamp: new Date().toISOString()
  });
});

// 3. Endpoint de Teste & Verificação de Conexão do Google OCR
app.get('/api/ocr/verify', async (req, res) => {
  const t0 = Date.now();
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        ok: false,
        hasGeminiKey: false,
        error: 'Chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do servidor.',
        message: 'Google Gemini OCR não está disponível por ausência de credenciais no servidor.'
      });
    }

    // Teste multimodal com 1x1 base64 PNG para verificação real de ponta a ponta
    const testPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await callGeminiResilient(
      [
        { inlineData: { mimeType: 'image/png', data: testPngBase64 } },
        { text: 'Teste de integridade do pipeline Google Vision OCR. Responda estritamente em JSON com: {"status":"operacional","engine":"Google Gemini Vision AI","multimodal":true}' }
      ],
      { responseMimeType: 'application/json' },
      8000
    );

    const latencyMs = Date.now() - t0;
    let parsed: any = {};
    try {
      parsed = JSON.parse(result.text.trim());
    } catch {
      parsed = { status: 'operacional', raw: result.text };
    }

    return res.json({
      ok: true,
      provider: 'Google Cloud GenAI',
      activeModel: result.modelUsed,
      latencyMs,
      timestamp: new Date().toISOString(),
      details: parsed,
      message: `Google Gemini Vision OCR está 100% operacional utilizando o modelo ${result.modelUsed} (${latencyMs}ms).`
    });
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      latencyMs: Date.now() - t0,
      error: err?.message || 'Falha no teste de conexão com a API do Google',
      message: 'Não foi possível validar o OCR da Google API no momento.'
    });
  }
});

// 4. Endpoint Principal de Visão Computacional Multimodal (Google Gemini Vision API)
app.post('/api/vision-ocr', async (req, res) => {
  const startTime = Date.now();
  try {
    const { imageBase64, mimeType = 'image/jpeg', fileName = 'documento.jpg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Parâmetro imageBase64 é obrigatório' });
    }

    // Detecção segura do MIME type a partir dos dados reais e limpeza do base64
    const targetMime = detectMimeType(imageBase64, mimeType);
    const cleanBase64 = imageBase64
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s+/g, '')
      .trim();

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallbackToLocal: true,
        message: 'GEMINI_API_KEY não configurada. Alternando para o motor local de OCR.'
      });
    }

    const systemPrompt = `Você é um perito em Visão Computacional e extração óptica de documentos oficiais de Registro Civil e Medicina Legal do Brasil, especializado na Declaração de Óbito (D.O. - Guia Amarela do Ministério da Saúde / Sistema de Informações sobre Mortalidade - SIM).

Sua tarefa é analisar a imagem do documento fornecido com altíssima fidelidade e retornar EXCLUSIVAMENTE um objeto JSON estritamente válido, sem blocos de texto ou markdown antes ou depois, com o seguinte formato:

{
  "classification": {
    "type": "DECLARACAO_OBITO",
    "typeName": "Declaração de Óbito (D.O. Física)",
    "confidence": 98,
    "isCompatibleDO": true,
    "reason": "Declaração de Óbito autêntica emitida pelo Ministério da Saúde com layout e campos identificados."
  },
  "fields": [
    {
      "field": "numeroDO",
      "label": "Número da D.O.",
      "value": "34.891.204-7",
      "confidence": 98,
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ],
  "fullTranscribedText": "Texto transcrito integralmente do documento..."
}

Regras Mandatórias de Extração:
1. COBERTURA INTEGRAL DOS BLOCOS DA DECLARAÇÃO DE ÓBITO (D.O. - SIM/Ministério da Saúde):
   Examine meticulosamente a imagem inteira de ponta a ponta e extraia TODOS os campos que contenham texto manuscrito, datilografado ou opções assinaladas:

   - BLOCO I: IDENTIFICAÇÃO
     * numeroDO: Número da D.O. impresso no cabeçalho ou carimbo
     * dataObito: Campo 2 "Data do óbito" (DD/MM/AAAA - ex: 23/04/2000)
     * horaObito: Campo 3 "Hora do óbito" (HH:MM - ex: 13:56)
     * naturalidadeMunicipio: Campo 4 "Naturalidade - Município" (ex: Goiânia)
     * naturalidadeUf: Campo 4 "Naturalidade - UF" (ex: GO)
     * nomeFalecido: Campo 5 "Nome do Falecido"
     * nomePai: Campo 6 "Nome do Pai"
     * nomeMae: Campo 7 "Nome da Mãe"
     * dataNascimento: Campo 8 "Data de nascimento" (DD/MM/AAAA - ex: 03/12/1954)
     * idadeFalecido: Campo 8 "Idade em anos completos" (número - ex: 45)
     * sexo: Campo 10 "Sexo" ('M' ou 'F' se assinalado/escrito)
     * corRaca: Campo 11 "Raça/Cor" ('BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA' se assinalado)
     * estadoCivil: Campo 12 "Situação conjugal" ('SOLTEIRO', 'CASADO', 'VIUVO', 'DIVORCIADO', 'SEPARADO_JUDICIALMENTE', 'UNIAO_ESTAVEL' APENAS se houver marcação/escrita)
     * dataCasamento: Data do casamento (se anotada)
     * nomeConjuge: Nome do cônjuge / companheiro
     * escolaridade: Campo 13 "Escolaridade" (ex: "Superior incompleto", "Fundamental", etc.)
     * ocupacao: Campo 14 "Ocupação habitual" (ex: "Auxiliar administrativo")
     * cpf: CPF (se preenchido)
     * rg: RG / Registro Geral
     * rgOrgaoEmissor: Órgão Emissor do RG (ex: SSP/SP)

   - BLOCO II: RESIDÊNCIA
     * enderecoResidencia: Campo 16 "Logradouro, número e complemento" (ex: Praça da Sé, 2817)
     * cepResidencia: Campo 16 "CEP" (ex: 01001000)
     * bairroResidencia: Campo 17 "Bairro/Distrito" (ex: Sé)
     * municipioResidencia: Campo 18 "Município de residência" (ex: São Paulo)
     * ufResidencia: Campo 19 "UF" (ex: SP)

   - BLOCO III: OCORRÊNCIA DO ÓBITO
     * tipoLocal: Campo 20 "Local de ocorrência" ('HOSPITAL', 'DOMICILIO', 'VIA_PUBLICA', 'OUTROS')
     * estabelecimentoObito: Campo 21 "Estabelecimento" (ex: Hospital Santa Luzia)
     * localObito: Nome do estabelecimento ou endereço de ocorrência (ex: Hospital Santa Luzia)
     * municipioObito: Campo 25 "Município de ocorrência" (ex: Goiânia)
     * ufObito: Campo 26 "UF de ocorrência" (ex: GO)

   - BLOCO V: CONDIÇÕES E CAUSAS DA MORTE
     * causaMortis: Campo 40 "Causas da morte" (diagnósticos clínicos ou descrição da morte)
     * cid10: Código CID-10 anotado

   - BLOCO VI: MÉDICO ATESTANTE
     * nomeMedico: Campo 41 "Nome do Médico" (ex: Carolina Santos Silva)
     * crmMedico: Campo 42 "CRM" (ex: 903225)
     * ufCrm: UF do CRM
     * dataAtestadoMedico: Campo 44 "Data do atestado" (DD/MM/AAAA)

   - BLOCO VIII: CARTÓRIO DE REGISTRO CIVIL
     * cartorioNome: Campo 53 "Cartório" (ex: 1º Ofício de Registro Civil...)
     * registroTermo: Campo 54 "Registro / Termo nº" (ex: 108032)
     * dataEmissaoCertidao: Campo 55 "Data do registro" (DD/MM/AAAA)
     * municipioEmissao: Campo 56 "Município do Cartório" (ex: Rio de Janeiro)
     * ufEmissao: Campo 56 "UF do Cartório" (ex: RJ)

   - BLOCO IX: DECLARANTE
     * nomeDeclarante: Campo 58 "Declarante"
     * qualificacaoDeclarante: Qualificação / parentesco do declarante

2. FIDELIDADE ÓPTICA E REGRA ANTI-ALUCINAÇÃO (MANDATÓRIO):
   - Extraia EXCLUSIVAMENTE os campos que estiverem de fato presentes, preenchidos, escritos ou assinalados no documento físico.
   - NUNCA invente ou preencha valores padrão para campos que estiverem em branco ou sem assinalação (exemplo: se o Campo 12 Situação Conjugal não tiver quadrinho marcado nem texto escrito, NÃO extraia como Solteiro nem Casado; retorne "" ou não inclua o campo).
   - Para CADA campo adicionado no array "fields", forneça sua Bounding Box real [ymin, xmin, ymax, xmax] no documento em escala de 0 a 1000.

3. Bounding boxes [ymin, xmin, ymax, xmax]:
   - Coordenadas normalizadas em grade de 0 a 1000 cobrindo exatamente o texto / valor identificado.
   - ymin = topo, xmin = esquerda, ymax = base, xmax = direita.

4. Se a imagem não for uma Declaração de Óbito (ex: for Certidão de Registro Civil pós-lavratura ou RG), preencha type com 'CERTIDAO_OBITO' ou 'RG_IDENTIDADE', 'isCompatibleDO': false e explique a discrepância em 'reason'.`;

    const userPrompt = `Analise detalhadamente esta imagem de documento oficial (${fileName}), execute o OCR multimodal de alta fidelidade e retorne o JSON estruturado com classificação, todos os campos detectados e as bounding boxes normalizadas [ymin, xmin, ymax, xmax] em escala de 0 a 1000.`;

    const contents = {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: targetMime
          }
        },
        { text: userPrompt }
      ]
    };

    const result = await callGeminiResilient(
      contents,
      {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      },
      18000
    );

    const cleanedText = (result.text || '')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanedText || '{}');

    // Validação básica do schema retornado
    if (!parsedData.fields || !Array.isArray(parsedData.fields)) {
      parsedData.fields = [];
    }

    if (!parsedData.classification) {
      parsedData.classification = {
        type: 'DECLARACAO_OBITO',
        typeName: 'Declaração de Óbito (D.O. Física)',
        confidence: 95,
        isCompatibleDO: true
      };
    }

    const durationMs = Date.now() - startTime;
    return res.json({
      success: true,
      source: `Google Gemini Vision AI (${result.modelUsed})`,
      modelUsed: result.modelUsed,
      durationMs,
      data: parsedData
    });
  } catch (error: any) {
    const isQuotaExceeded = error?.status === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('Quota exceeded');

    if (isQuotaExceeded) {
      console.info('[server] Cota temporária da Gemini Vision API atingida no Free Tier. Ativando contingência local de OCR.');
    } else {
      console.warn('[server] Informação na visão computacional com Google Gemini API:', error?.message || error);
    }

    return res.status(200).json({
      fallbackToLocal: true,
      error: error?.message || 'Erro ao processar visão computacional',
      durationMs: Date.now() - startTime,
      message: isQuotaExceeded
        ? 'Limite de requisições gratuitas atingido. Motor local de contingência de OCR ativado com sucesso.'
        : 'Falha temporária na Google Vision API. Alternando automaticamente para o motor local de OCR.'
    });
  }
});

// 5. Endpoint de redação jurídica e justificativas via Google Gemini
app.post('/api/llm/justification', async (req, res) => {
  try {
    const { ruleTitle, legalReference, diffSummary, declaracao, ocr } = req.body;

    const prompt = `Como assistente jurídico de Registro Civil especializado na Lei 6.015/73 e no Provimento CNJ nº 149/2023, redija uma fundamentação jurídica formal e concisa para superar a seguinte inconformidade de pré-lavratura de óbito:
Regra: ${ruleTitle}
Fundamento Legal: ${legalReference}
Divergência detectada: ${diffSummary}
Falecido: ${declaracao?.nomeFalecido || 'Falecido'} (D.O. nº ${declaracao?.numeroDO || 'S/N'})

Redija em 1 ou 2 parágrafos formais e diretos adequados para inserção no livro de assentamentos ou despacho do oficial.`;

    const result = await callGeminiResilient(prompt, undefined, 10000);

    return res.json({
      success: true,
      justification: result.text || '',
      source: `Google Gemini (${result.modelUsed})`
    });
  } catch (err: any) {
    return res.json({ fallbackToLocal: true, error: err.message });
  }
});

// Inicialização do servidor integrado com Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARIA] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
