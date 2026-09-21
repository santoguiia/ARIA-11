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

// 1. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    visionModel: 'gemini-flash-latest',
    timestamp: new Date().toISOString()
  });
});

// 2. Endpoint de Visão Computacional com Vision LLM (Multimodal)
// Processa via servidor local Qwen2-VL (porta 8089) com fallback inteligente
app.post('/api/vision-ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', fileName = 'documento.jpg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Parâmetro imageBase64 é obrigatório' });
    }

    let cleanUrl = imageBase64;
    if (!cleanUrl.startsWith('data:')) {
      cleanUrl = `data:${mimeType};base64,${imageBase64}`;
    }

    // 1. Tentar chamar o motor multimodal local Qwen2-VL (http://127.0.0.1:8089)
    try {
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
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ],
  "fullTranscribedText": "Texto transcrito integralmente"
}

Extraia todos os campos presentes: numeroDO, nomeFalecido, cpf, rg, rgOrgaoEmissor, dataNascimento, sexo, corRaca, estadoCivil, dataCasamento, nomeConjuge, nomeMae, nomePai, dataObito, horaObito, localObito, tipoLocal, municipioObito, ufObito, causaMortis, cid10, nomeMedico, crmMedico, ufCrm, sepultamentoCremacao, cemiterio, deixouBens, deixouTestamento, deixouFilhos, qtdFilhos, nomesFilhos, nomeDeclarante, qualificacaoDeclarante.
Responda APENAS com o objeto JSON sem introduções ou explicações fora do JSON.`;

      const localPayload = {
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

      const localRes = await fetch('http://127.0.0.1:8089/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localPayload),
        signal: AbortSignal.timeout(45000)
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        const content = localData.choices?.[0]?.message?.content || '{}';
        const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleaned);

        return res.json({
          success: true,
          source: 'Qwen2-VL-2B Multimodal (Local Edge)',
          data: parsed
        });
      }
    } catch (localErr: any) {
      console.log('[server] Motor Qwen2-VL local não disponível no momento, testando fallback:', localErr.message);
    }

    // 2. Fallback para Gemini se chave configurada
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallbackToLocal: true,
        message: 'Servidor Qwen2-VL offline e GEMINI_API_KEY não configurada. Utilizando OCR gráfico local.'
      });
    }

    const systemPrompt = `Você é um especialista em Visão Computacional e análise de documentos oficiais de Registro Civil e Medicina Legal.
Analise a imagem deste documento com extrema precisão óptica e responda no formato JSON estruturado com classificação e campos com bounding boxes [ymin, xmin, ymax, xmax] normalizados de 0 a 1000.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType
          }
        },
        { text: 'Execute o OCR completo de visão computacional detectando todas as entidades e suas respectivas bounding boxes [ymin, xmin, ymax, xmax] em escala 0-1000.' }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '{}';
    const parsedResult = JSON.parse(responseText);

    return res.json({
      success: true,
      source: 'Vision LLM (Gemini 2.5 Flash Multimodal Fallback)',
      data: parsedResult
    });
  } catch (error: any) {
    console.error('Erro na visão computacional com LLM:', error);
    return res.status(200).json({
      fallbackToLocal: true,
      error: error.message || 'Erro ao processar visão computacional',
      message: 'Falha na comunicação com Vision LLM. Alternando automaticamente para o motor local de OCR.'
    });
  }
});

// 3. Endpoint de redação jurídica e justificativas via LLM
app.post('/api/llm/justification', async (req, res) => {
  try {
    const { ruleTitle, legalReference, diffSummary, declaracao, ocr } = req.body;

    // 1. Tentar servidor local Qwen2-VL
    try {
      const prompt = `Como assistente jurídico de Registro Civil especializado na Lei 6.015/73 e no Provimento CNJ nº 149/2023, redija uma fundamentação jurídica formal e concisa para superar a seguinte inconformidade de pré-lavratura de óbito:
Regra: ${ruleTitle}
Fundamento Legal: ${legalReference}
Divergência detectada: ${diffSummary}
Falecido: ${declaracao?.nomeFalecido || 'Falecido'} (D.O. nº ${declaracao?.numeroDO || 'S/N'})

Redija em 1 ou 2 parágrafos formais e diretos adequados para inserção no livro de assentamentos ou despacho do oficial.`;

      const localRes = await fetch('http://127.0.0.1:8089/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2-vl',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 350
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        const justification = localData.choices?.[0]?.message?.content?.trim();
        if (justification) {
          return res.json({
            success: true,
            justification,
            source: 'Qwen2-VL-2B (Local Edge)'
          });
        }
      }
    } catch (e) {
      //
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ fallbackToLocal: true });
    }

    const prompt = `Como assistente jurídico de Registro Civil especializado na Lei 6.015/73 e no Provimento CNJ nº 149/2023, redija uma fundamentação jurídica formal e concisa para superar a seguinte inconformidade de pré-lavratura de óbito:
Regra: ${ruleTitle}
Fundamento Legal: ${legalReference}
Divergência detectada: ${diffSummary}
Falecido: ${declaracao?.nomeFalecido || 'Falecido'} (D.O. nº ${declaracao?.numeroDO || 'S/N'})`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt
    });

    res.json({
      success: true,
      justification: response.text || '',
      source: 'Gemini 2.5 Flash'
    });
  } catch (err: any) {
    res.json({ fallbackToLocal: true, error: err.message });
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
