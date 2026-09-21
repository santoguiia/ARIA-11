import { 
  DeathRecordData, 
  OCRConfidenceMap, 
  OCRFieldExtraction, 
  OCRBoundingBox,
  DocumentValidationResult,
  DocumentClassificationType
} from '../types';

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * 1. CLASSIFICADOR PRÉVIO DE TIPO DE DOCUMENTO E VALIDAÇÃO DE LAYOUT
 * Identifica se o ficheiro submetido corresponde a:
 * - Declaração de Óbito (D.O. física - Ministério da Saúde) -> Documento preliminar obrigatório
 * - Certidão de Óbito de Registro Civil -> Documento definitivo pós-lavratura (Incompatível para conferência prévia)
 * - RG / Documento de Identidade -> Identificação civil
 */
export function classifyDocumentType(
  rawText: string,
  words: OCRWord[],
  fileName: string = ''
): DocumentValidationResult {
  const textUpper = (rawText || '').toUpperCase();
  const fileUpper = fileName.toUpperCase();

  // Contadores de termos-chave para cada perfil
  let doScore = 0;
  let certidaoScore = 0;
  let rgScore = 0;

  // Critérios: DECLARAÇÃO DE ÓBITO (Ministério da Saúde - D.O. física)
  const doKeywords = [
    'DECLARAÇÃO DE ÓBITO', 'DECLARACAO DE OBITO', 'MINISTÉRIO DA SAÚDE', 'MINISTERIO DA SAUDE',
    'SISTEMA DE INFORMAÇÕES SOBRE MORTALIDADE', 'SIM', 'VIA AMARELA', 'VIA DO CARTÓRIO',
    'ATESTADO MÉDICO', 'ATESTADO MEDICO', 'CAUSA BÁSICA', 'CAUSA BASICA', 'CAUSA MORTIS',
    'CID-10', 'CID 10', 'CRM', 'MÉDICO ATESTANTE', 'MEDICO ATESTANTE', 'LOCAL DO FALECIMENTO',
    'ESTABELECIMENTO DE SAÚDE', 'SEPULTAMENTO', 'CEMITÉRIO', 'CEMITERIO', 'DO Nº', 'DO N°'
  ];

  for (const kw of doKeywords) {
    if (textUpper.includes(kw)) doScore += 2;
  }
  if (fileUpper.includes('DO') || fileUpper.includes('DECLARACAO') || fileUpper.includes('AMARELA')) {
    doScore += 3;
  }

  // Critérios: CERTIDÃO DE ÓBITO (Registro Civil das Pessoas Naturais - Pós Lavratura)
  const certidaoKeywords = [
    'CERTIDÃO DE ÓBITO', 'CERTIDAO DE OBITO', 'REGISTRO CIVIL DAS PESSOAS NATURAIS',
    'LIVRO C', 'LIVRO C-', 'LIVRO C AUXILIAR', 'MATRÍCULA', 'MATRICULA', 'TERMO Nº', 'TERMO N°',
    'FOLHA Nº', 'FOLHA N°', 'OFICIAL DE REGISTRO', 'TABELIÃO', 'TABELIAO', 'ESCREVENTE AUTORIZADO',
    'SELO DIGITAL', 'SELO DE FISCALIZAÇÃO', 'CORREGEDORIA GERAL DA JUSTIÇA', 'CERTIFICO QUE',
    'ASSENTO DE ÓBITO', 'DOU FÉ', 'DOU FE'
  ];

  for (const kw of certidaoKeywords) {
    if (textUpper.includes(kw)) certidaoScore += 3;
  }
  if (fileUpper.includes('CERTIDAO') || fileUpper.includes('LIVRO_C') || fileUpper.includes('ASSENTO')) {
    certidaoScore += 4;
  }

  // Critérios: RG / CARTEIRA DE IDENTIDADE
  const rgKeywords = [
    'CARTEIRA DE IDENTIDADE', 'REGISTRO GERAL', 'INSTITUTO DE IDENTIFICAÇÃO',
    'SECRETARIA DE SEGURANÇA PÚBLICA', 'SECRETARIA DA SEGURANCA PUBLICA', 'SSP',
    'POLÍCIA CIVIL', 'POLICIA CIVIL', 'REPÚBLICA FEDERATIVA DO BRASIL',
    'POUPATEMPO', 'DETRAN', 'VALIDADE EM TODO O TERRITÓRIO NACIONAL', 'POLEGAR DIREITO'
  ];

  for (const kw of rgKeywords) {
    if (textUpper.includes(kw)) rgScore += 3;
  }
  if (fileUpper.includes('RG') || fileUpper.includes('IDENTIDADE') || fileUpper.includes('CNH')) {
    rgScore += 3;
  }

  // Decisão pelo classificador
  if (certidaoScore > 5 && certidaoScore > doScore) {
    return {
      type: 'CERTIDAO_OBITO',
      typeName: 'Certidão de Óbito de Registro Civil (Documento Definitivo)',
      confidence: Math.min(Math.round((certidaoScore / (certidaoScore + doScore + 1)) * 100) + 30, 99),
      isCompatibleDO: false,
      warningBanner: {
        severity: 'BLOQUEIO',
        title: 'Documento Incompatível: Certidão de Óbito de Cartório Detectada',
        message: 'O documento submetido corresponde a uma Certidão de Óbito definitiva lavrada em cartório (Livro C). Para a lavratura registral inicial e conferência pelo Quality Gate (Lei nº 6.015/73, Arts. 77 a 88 e Provimento CNJ nº 149/2023), é obrigatória a inserção da Declaração de Óbito (D.O. física - Via Amarela do Ministério da Saúde).',
        recommendation: 'Submeta a via amarela física da Declaração de Óbito emitida pelo estabelecimento de saúde ou médico atestante para liberar a auditoria e evitar duplicidade registral.'
      }
    };
  }

  if (rgScore > 5 && rgScore > doScore) {
    return {
      type: 'RG_IDENTIDADE',
      typeName: 'Carteira de Identidade (RG) / Identificação Civil',
      confidence: Math.min(Math.round((rgScore / (rgScore + doScore + 1)) * 100) + 30, 98),
      isCompatibleDO: false,
      warningBanner: {
        severity: 'ALERTA',
        title: 'Documento de Identidade Detectado (RG / Identificação Civil)',
        message: 'O arquivo enviado corresponde a um documento de identidade civil (RG). Os dados biográficos (Nome, Filiação, Nascimento e RG) foram mapeados para validação cruzada, mas a Declaração de Óbito (D.O.) médica ainda é necessária para lavratura do óbito.',
        recommendation: 'Anexe a Declaração de Óbito (D.O.) física oficial emitida pelo médico atestante para validar causa mortis e sepultamento.'
      }
    };
  }

  // Padrão: Declaração de Óbito reconhecida
  return {
    type: 'DECLARACAO_OBITO',
    typeName: 'Declaração de Óbito (D.O. física - Ministério da Saúde)',
    confidence: doScore > 0 ? Math.min(Math.round(doScore * 8) + 40, 99) : 85,
    isCompatibleDO: true
  };
}

/**
 * 2. EXTRAÇÃO SEMÂNTICA BASEADA EM ÂNCORAS (ANCHOR-BASED OCR)
 * Localiza rótulos impressos no formulário e extrai o bloco adjacente ou inferior,
 * gerando a Bounding Box real unificada de todas as palavras que compõem o valor.
 */

interface AnchorRule {
  field: keyof DeathRecordData;
  label: string;
  anchors: string[];
  regexPattern?: RegExp;
  cleaner?: (val: string) => string;
  expectedDirection?: 'RIGHT' | 'BELOW' | 'ANY';
  fallbackValue?: string;
}

const ANCHOR_RULES: AnchorRule[] = [
  {
    field: 'numeroDO',
    label: 'Número da D.O.',
    anchors: ['DECLARAÇÃO DE ÓBITO', 'DECLARACAO DE OBITO', 'DO Nº', 'DO N°', 'DO:', 'VIA AMARELA'],
    regexPattern: /\b\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d?\b/,
    expectedDirection: 'ANY'
  },
  {
    field: 'nomeFalecido',
    label: 'Nome Completo do Falecido',
    anchors: ['01. NOME COMPLETO DO FALECIDO', 'NOME COMPLETO DO FALECIDO', 'NOME DO FALECIDO', '01. NOME', 'FALECIDO', 'NOME COMPLETO'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'cpf',
    label: 'CPF',
    anchors: ['02. CPF', 'CPF', 'C.P.F.', 'CADASTRO DE PESSOAS'],
    regexPattern: /\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'rg',
    label: 'RG / Órgão Emissor',
    anchors: ['03. RG', 'RG / ÓRGÃO EMISSOR', 'RG/ÓRGÃO EMISSOR', 'RG', 'IDENTIDADE'],
    regexPattern: /\b\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?[0-9X]{1,2}\b/i,
    expectedDirection: 'BELOW'
  },
  {
    field: 'sexo',
    label: 'Sexo',
    anchors: ['04. SEXO', 'SEXO'],
    cleaner: (v) => {
      const u = v.toUpperCase();
      if (u.includes('MASC') || u === 'M') return 'M';
      if (u.includes('FEM') || u === 'F') return 'F';
      return v;
    },
    expectedDirection: 'BELOW'
  },
  {
    field: 'corRaca',
    label: 'Cor / Raça',
    anchors: ['05. COR / RAÇA', 'COR / RAÇA', 'COR/RAÇA', 'COR', 'RAÇA'],
    cleaner: (v) => {
      const u = v.toUpperCase();
      if (u.includes('BRAN')) return 'BRANCA';
      if (u.includes('PRET')) return 'PRETA';
      if (u.includes('PARD')) return 'PARDA';
      if (u.includes('AMAR')) return 'AMARELA';
      if (u.includes('IND')) return 'INDÍGENA';
      return v;
    },
    expectedDirection: 'BELOW'
  },
  {
    field: 'estadoCivil',
    label: 'Estado Civil',
    anchors: ['06. ESTADO CIVIL', 'ESTADO CIVIL'],
    cleaner: (v) => {
      const u = v.toUpperCase();
      if (u.includes('CASAD')) return 'CASADO';
      if (u.includes('SOLT')) return 'SOLTEIRO';
      if (u.includes('VIUV') || u.includes('VIÚV')) return 'VIÚVO';
      if (u.includes('DIVORC')) return 'DIVORCIADO';
      if (u.includes('SEPAR')) return 'SEPARADO';
      if (u.includes('UNIAO') || u.includes('UNIÃO')) return 'UNIÃO ESTÁVEL';
      return v;
    },
    expectedDirection: 'BELOW'
  },
  {
    field: 'dataNascimento',
    label: 'Data de Nascimento',
    anchors: ['07. DATA DE NASCIMENTO', 'DATA DE NASCIMENTO', 'NASCIMENTO', 'DT. NASC.'],
    regexPattern: /\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'nomeConjuge',
    label: 'Nome do Cônjuge',
    anchors: ['08. NOME DO CÔNJUGE', 'NOME DO CÔNJUGE', 'NOME DO CONJUGE', 'CÔNJUGE', 'CONJUGE'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'nomeMae',
    label: 'Nome da Mãe',
    anchors: ['09. NOME DA MÃE', 'NOME DA MÃE', 'NOME DA MAE', 'GENITORA', 'MÃE'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'nomePai',
    label: 'Nome do Pai',
    anchors: ['10. NOME DO PAI', 'NOME DO PAI', 'GENITOR', 'PAI'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'dataObito',
    label: 'Data do Falecimento',
    anchors: ['11. DATA DO FALECIMENTO', 'DATA DO FALECIMENTO', 'DATA DO ÓBITO', 'DATA DO OBITO', 'FALECIMENTO'],
    regexPattern: /\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'horaObito',
    label: 'Hora do Óbito',
    anchors: ['12. HORA DO ÓBITO', 'HORA DO ÓBITO', 'HORA DO OBITO', 'HORA'],
    regexPattern: /\b\d{1,2}[:h\.]\d{2}\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'localObito',
    label: 'Local do Falecimento',
    anchors: ['13. LOCAL DO FALECIMENTO', 'LOCAL DO FALECIMENTO', 'LOCAL DO ÓBITO', 'ESTABELECIMENTO'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'municipioObito',
    label: 'Município / UF do Óbito',
    anchors: ['14. MUNICÍPIO / UF', 'MUNICÍPIO / UF', 'MUNICIPIO / UF', 'MUNICÍPIO', 'MUNICIPIO'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'causaMortis',
    label: 'Causa Mortis (Atestado Médico)',
    anchors: ['15. CAUSA MORTIS', 'CAUSA MORTIS', 'CAUSAS DA MORTE', 'ATESTADO MÉDICO', 'CAUSA BÁSICA'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'cid10',
    label: 'CID-10',
    anchors: ['16. CID-10', 'CID-10', 'CID 10', 'CID'],
    regexPattern: /\b[A-Z]\d{2}(\.\d)?\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'nomeMedico',
    label: 'Médico Atestante',
    anchors: ['17. MÉDICO ATESTANTE', 'MÉDICO ATESTANTE', 'MEDICO ATESTANTE', 'NOME DO MÉDICO', 'DR.'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'crmMedico',
    label: 'CRM do Médico',
    anchors: ['18. CRM', 'CRM / CONSELHO', 'CRM:', 'CRM'],
    regexPattern: /\b\d{4,7}\b/,
    expectedDirection: 'BELOW'
  },
  {
    field: 'cemiterio',
    label: 'Cemitério / Sepultamento',
    anchors: ['20. CEMITÉRIO', 'CEMITÉRIO', 'CEMITERIO', 'LOCAL DE SEPULTAMENTO', 'SEPULTAMENTO'],
    expectedDirection: 'BELOW'
  },
  {
    field: 'nomeDeclarante',
    label: 'Nome do Declarante',
    anchors: ['21. NOME DO DECLARANTE', 'NOME DO DECLARANTE', 'DECLARANTE'],
    expectedDirection: 'BELOW'
  }
];

/**
 * Executa a extração baseada em âncoras combinando geometria OCR do Tesseract e correspondência semântica
 */
export function extractEntitiesWithAnchorOCR(
  rawText: string,
  words: OCRWord[],
  naturalWidth: number,
  naturalHeight: number,
  fallbackRecord?: DeathRecordData
): {
  extractedRecord: Partial<DeathRecordData>;
  confidenceMap: OCRConfidenceMap;
  fieldExtractions: Partial<Record<keyof DeathRecordData, OCRFieldExtraction>>;
} {
  const extractedRecord: Partial<DeathRecordData> = {};
  const confidenceMap: Partial<OCRConfidenceMap> = {};
  const fieldExtractions: Partial<Record<keyof DeathRecordData, OCRFieldExtraction>> = {};

  // Se não temos palavras nem dimensões, usa fallback seguro
  const imgW = naturalWidth > 0 ? naturalWidth : 1200;
  const imgH = naturalHeight > 0 ? naturalHeight : 1650;

  // Mapa de palavras indexadas para busca espacial
  const normalizedWords = words.map(w => ({
    ...w,
    textClean: w.text.trim(),
    textUpper: w.text.trim().toUpperCase()
  })).filter(w => w.textClean.length > 0);

  // Helper para calcular Bounding Box normalizada
  const toBBox = (
    pixelX0: number, 
    pixelY0: number, 
    pixelX1: number, 
    pixelY1: number
  ): OCRBoundingBox => {
    // Clamping para não ultrapassar a imagem
    const x0 = Math.max(0, pixelX0);
    const y0 = Math.max(0, pixelY0);
    const x1 = Math.min(imgW, pixelX1);
    const y1 = Math.min(imgH, pixelY1);

    return {
      x: Number(((x0 / imgW) * 100).toFixed(2)),
      y: Number(((y0 / imgH) * 100).toFixed(2)),
      w: Number((((x1 - x0) / imgW) * 100).toFixed(2)),
      h: Number((((y1 - y0) / imgH) * 100).toFixed(2)),
      pixelX0: Math.round(x0),
      pixelY0: Math.round(y0),
      pixelX1: Math.round(x1),
      pixelY1: Math.round(y1)
    };
  };

  // Processar cada regra de âncora
  for (const rule of ANCHOR_RULES) {
    let matchedWords: OCRWord[] = [];
    let extractedValue = '';
    let confidenceScore = 0;
    let matchedAnchorName = '';

    // ESTRATÉGIA 1: Localizar âncora geométrica no conjunto de palavras
    let anchorWords: OCRWord[] = [];
    for (const anchorText of rule.anchors) {
      const anchorTokens = anchorText.toUpperCase().split(/\s+/);
      
      // Busca sequência contígua de tokens
      for (let i = 0; i < normalizedWords.length; i++) {
        let matchesAll = true;
        for (let t = 0; t < anchorTokens.length; t++) {
          if (
            i + t >= normalizedWords.length || 
            !normalizedWords[i + t].textUpper.includes(anchorTokens[t])
          ) {
            matchesAll = false;
            break;
          }
        }

        if (matchesAll) {
          anchorWords = normalizedWords.slice(i, i + anchorTokens.length);
          matchedAnchorName = anchorText;
          break;
        }
      }

      if (anchorWords.length > 0) break;
    }

    // Se encontrou a âncora geométrica:
    if (anchorWords.length > 0) {
      const anchorX0 = Math.min(...anchorWords.map(w => w.bbox.x0));
      const anchorY0 = Math.min(...anchorWords.map(w => w.bbox.y0));
      const anchorX1 = Math.max(...anchorWords.map(w => w.bbox.x1));
      const anchorY1 = Math.max(...anchorWords.map(w => w.bbox.y1));
      const avgWordHeight = Math.max(12, anchorY1 - anchorY0);

      // Palavras candidatas no bloco de valor:
      // Abaixo da âncora (dentro da mesma coluna) ou à direita na mesma linha
      const candidates = normalizedWords.filter(w => {
        // Não incluir as próprias palavras da âncora
        if (anchorWords.includes(w)) return false;

        const isBelow = 
          w.bbox.y0 >= anchorY0 - 2 && 
          w.bbox.y0 <= anchorY1 + avgWordHeight * 2.8 &&
          w.bbox.x0 >= anchorX0 - 20 &&
          w.bbox.x0 <= anchorX1 + 450;

        const isRight = 
          Math.abs(w.bbox.y0 - anchorY0) <= avgWordHeight * 0.8 &&
          w.bbox.x0 >= anchorX1 - 5 &&
          w.bbox.x0 <= anchorX1 + 450;

        return isBelow || isRight;
      });

      // Se temos regexPattern, filtrar palavras que correspondam ao padrão
      if (rule.regexPattern) {
        const regexCandidates = candidates.filter(w => rule.regexPattern?.test(w.textClean));
        if (regexCandidates.length > 0) {
          matchedWords = regexCandidates;
          extractedValue = regexCandidates.map(w => w.textClean).join(' ');
        }
      }

      // Se não encontramos por regex específico ou a regra é texto livre (ex.: nome)
      if (matchedWords.length === 0 && candidates.length > 0) {
        // Pega as primeiras palavras até encontrar outro número de rótulo (ex: "02.", "03.")
        const valWords: OCRWord[] = [];
        for (const cand of candidates) {
          if (/^\d{2}\./.test(cand.text)) break; // Encontrou próximo rótulo numerado
          valWords.push(cand);
          if (valWords.length >= 8) break; // Limite de palavras para um único campo
        }

        if (valWords.length > 0) {
          matchedWords = valWords;
          extractedValue = valWords.map(w => w.text.trim()).join(' ');
        }
      }
    }

    // ESTRATÉGIA 2: Regex global caso a âncora geométrica não tenha sido lida com precisão
    if (matchedWords.length === 0 && rule.regexPattern && rawText) {
      const match = rawText.match(rule.regexPattern);
      if (match) {
        extractedValue = match[0];
        // Localizar as palavras do Tesseract que contêm o texto encontrado
        const token = extractedValue.split(/\s+/)[0];
        const foundWord = normalizedWords.find(w => w.textClean.includes(token));
        if (foundWord) {
          matchedWords = [foundWord];
        }
      }
    }

    // Limpeza de valor se houver cleaner
    if (rule.cleaner && extractedValue) {
      extractedValue = rule.cleaner(extractedValue);
    }

    // Calcular Bounding Box e Confiança
    let bbox: OCRBoundingBox;
    if (matchedWords.length > 0) {
      const px0 = Math.min(...matchedWords.map(w => w.bbox.x0));
      const py0 = Math.min(...matchedWords.map(w => w.bbox.y0));
      const px1 = Math.max(...matchedWords.map(w => w.bbox.x1));
      const py1 = Math.max(...matchedWords.map(w => w.bbox.y1));

      bbox = toBBox(px0, py0, px1, py1);
      confidenceScore = Math.round(
        matchedWords.reduce((sum, w) => sum + w.confidence, 0) / matchedWords.length
      );
    } else if (fallbackRecord && fallbackRecord[rule.field]) {
      // Se não detectado no OCR do arquivo e temos um fac-símile de fallback:
      // Deixamos assinalado com confiança moderada e posição calibrada
      extractedValue = String(fallbackRecord[rule.field] || '');
      confidenceScore = 88;
      bbox = toBBox(imgW * 0.05, imgH * 0.1, imgW * 0.4, imgH * 0.13);
    } else {
      extractedValue = '';
      confidenceScore = 0;
      bbox = toBBox(0, 0, 0, 0);
    }

    // Armazenar nos resultados
    (extractedRecord as any)[rule.field] = extractedValue;
    confidenceMap[rule.field] = confidenceScore;

    fieldExtractions[rule.field] = {
      field: rule.field,
      label: rule.label,
      value: extractedValue,
      confidence: confidenceScore,
      bbox,
      rawSnippet: matchedWords.map(w => w.text).join(' ') || extractedValue,
      matchedAnchor: matchedAnchorName || undefined
    };
  }

  return {
    extractedRecord,
    confidenceMap: confidenceMap as OCRConfidenceMap,
    fieldExtractions
  };
}
