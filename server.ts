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
// Recebe a imagem escaneada e utiliza o Gemini Vision para classificar o documento,
// extrair todas as entidades do ato de óbito e calcular as Bounding Boxes de cada campo.
app.post('/api/vision-ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', fileName = 'documento.jpg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Parâmetro imageBase64 é obrigatório' });
    }

    // Limpar o prefixo data:image/... se presente
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
    const ai = getGeminiClient();

    if (!ai) {
      // Se a chave GEMINI_API_KEY não estiver no ambiente, retorna sinal para usar motor local
      return res.status(200).json({
        fallbackToLocal: true,
        message: 'GEMINI_API_KEY não configurada no servidor. Utilizando motor local de visão computacional.'
      });
    }

    const systemPrompt = `Você é um especialista em Visão Computacional e análise de documentos oficiais de Registro Civil e Medicina Legal (Declarações de Óbito do Ministério da Saúde do Brasil, Certidões de Registro Civil e Documentos de Identidade).
Analise a imagem deste documento com extrema precisão óptica e responda no formato JSON estruturado:

1. CLASSIFICAÇÃO DE DOCUMENTO:
- Tipo: DECLARACAO_OBITO (D.O. física / Guia Amarela do Ministério da Saúde), CERTIDAO_OBITO (Certidão de Cartório / Livro C pós-lavratura), ou RG_IDENTIDADE (Carteira de Identidade civil).
- Compatível: Apenas DECLARACAO_OBITO é compatível como via preliminar para lavratura. Se for CERTIDAO_OBITO ou RG, informe que não é a D.O. física.

2. EXTRAÇÃO DE ENTIDADES:
Para cada campo presente, extraia o valor legível e determine as coordenadas da Bounding Box (caixa delimitadora) [ymin, xmin, ymax, xmax] normalizadas em uma escala de 0 a 1000 (onde 0,0 é o canto superior esquerdo e 1000,1000 é o canto inferior direito da imagem).
Campos a extrair:
- numeroDO: Número impresso da Declaração de Óbito
- nomeFalecido: Nome completo do falecido
- cpf: CPF do falecido
- rg: RG do falecido
- rgOrgaoEmissor: Órgão expedidor
- dataNascimento: DD/MM/AAAA
- sexo: 'M', 'F' ou 'I'
- corRaca: 'BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA'
- estadoCivil: 'SOLTEIRO', 'CASADO', 'VIUVO', 'VIUVA', 'DIVORCIADO', 'SEPARADO_JUDICIALMENTE'
- nomeMae: Nome completo da mãe
- nomePai: Nome completo do pai
- dataObito: DD/MM/AAAA da morte
- horaObito: HH:MM
- localObito: Estabelecimento / Hospital / Endereço
- tipoLocal: 'HOSPITAL', 'DOMICILIO', 'VIA_PUBLICA', 'OUTROS'
- municipioObito: Cidade do falecimento
- ufObito: UF (ex: SC, SP, RJ)
- causaMortis: Causa da morte completa (parte I linhas a, b, c, d e parte II)
- cid10: Código CID-10 informado
- nomeMedico: Nome completo do médico atestante
- crmMedico: Número do CRM
- ufCrm: UF do CRM
- sepultamentoCremacao: 'SEPULTAMENTO' ou 'CREMACAO'
- cemiterio: Nome do cemitério ou crematório
- deixouBens: 'SIM', 'NAO' ou 'IGNORADO'
- deixouTestamento: 'SIM', 'NAO' ou 'IGNORADO'
- deixouFilhos: 'SIM', 'NAO' ou 'IGNORADO'
- qtdFilhos: Número de filhos
- nomeDeclarante: Nome do declarante`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType
          }
        },
        {
          text: 'Execute o OCR completo de visão computacional detectando todas as entidades e suas respectivas bounding boxes [ymin, xmin, ymax, xmax] em escala 0-1000.'
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                typeName: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                isCompatibleDO: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
              },
              required: ['type', 'typeName', 'confidence', 'isCompatibleDO']
            },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  box_2d: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: '[ymin, xmin, ymax, xmax] normalizados de 0 a 1000'
                  }
                },
                required: ['field', 'label', 'value', 'confidence', 'box_2d']
              }
            },
            fullTranscribedText: { type: Type.STRING }
          },
          required: ['classification', 'fields']
        }
      }
    });

    const responseText = response.text || '{}';
    const parsedResult = JSON.parse(responseText);

    return res.json({
      success: true,
      source: 'Vision LLM (Gemini 2.5 Flash Multimodal)',
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
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ fallbackToLocal: true });
    }

    const prompt = `Como assistente jurídico de Registro Civil especializado na Lei 6.015/73 e no Provimento CNJ nº 149/2023, redija uma fundamentação jurídica formal e concisa para superar a seguinte inconformidade de pré-lavratura de óbito:
Regra: ${ruleTitle}
Fundamento Legal: ${legalReference}
Divergência detectada: ${diffSummary}
Falecido: ${declaracao?.nomeFalecido || 'Falecido'} (D.O. nº ${declaracao?.numeroDO || 'S/N'})

Redija em 1 ou 2 parágrafos formais e diretos adequados para inserção no livro de assentamentos ou despacho do oficial.`;

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
