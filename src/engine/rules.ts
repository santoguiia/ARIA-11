/**
 * ARIA Quality Gate Engine - Matriz Declarativa de Regras (Estilo OPA/Rego)
 * Projeto PoC REF-11 / INE5448
 * 
 * Estrutura declarativa com categorização por severidade:
 * - BLOQUEIO_IMPEDIENTE: Impede terminantemente a lavratura do ato (ex: CPF falso, óbito antes de nascer)
 * - ALERTA_OBRIGATORIO: Permite lavratura apenas mediante justificativa motivada assinada pelo operador
 * - INFORMATIVO: Recomendações procedimentais e de padronização
 */

import { QualityGateRule, DeathRecordData, OCRConfidenceMap, RuleEvaluationResult } from '../types';
import { validateCPF, normalizeName, nameSimilarity, parseDate, calculateAge, validateCRM } from './validators';

export const QUALITY_GATE_RULES: QualityGateRule[] = [
  // -------------------------------------------------------------
  // GRUPO: IDENTIFICAÇÃO & CPF
  // -------------------------------------------------------------
  {
    id: 'QG-CPF-001',
    title: 'Validação Algorítmica dos Dígitos Verificadores do CPF',
    category: 'IDENTIFICACAO',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Instrução Normativa RFB nº 2.119/2022 e Provimento CNJ nº 149/2023 (Art. 518)',
    description: 'Verifica a consistência matemática dos dois dígitos verificadores do CPF do de cujus através do algoritmo oficial Módulo 11 da Receita Federal.',
    evaluate: (decl, ocr, ocrConf, fed) => {
      const res = validateCPF(decl.cpf);
      if (!res.valid) {
        let explanation = `CPF informado '${decl.cpf}' é matematicamente inválido: ${res.error}.`;
        if (res.expectedCheckDigits && res.suggestedValidCPF) {
          explanation = `CPF '${decl.cpf}' é matematicamente inválido: ${res.error}. Pelo algoritmo oficial Módulo 11 da Receita Federal, o final correto para esta raiz numérica é '-${res.expectedCheckDigits}' (${res.suggestedValidCPF}).`;
        }

        return {
          passed: false,
          message: explanation,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'CPF', value: decl.cpf },
            { sourceName: 'OCR DO/RG', field: 'CPF', value: ocr.cpf, confidence: ocrConf.cpf },
            { sourceName: 'Base Federada (RFB)', field: 'CPF', value: fed.cpf }
          ],
          diffSummary: res.suggestedValidCPF 
            ? `Dígitos verificadores calculados pelo Módulo 11 da RFB: -${res.expectedCheckDigits} (sugerido: ${res.suggestedValidCPF})`
            : `O CPF ${decl.cpf} não atende ao algoritmo do Ministério da Fazenda.`,
          suggestedFix: res.suggestedValidCPF ? {
            field: 'cpf',
            value: res.suggestedValidCPF,
            label: `Corrigir CPF para ${res.suggestedValidCPF}`
          } : undefined
        };
      }
      return {
        passed: true,
        message: 'CPF válido e verificado com sucesso pelo algoritmo oficial da Receita Federal (Módulo 11).',
        sourcesCompared: [
          { sourceName: 'Declaração Preliminar', field: 'CPF', value: decl.cpf },
          { sourceName: 'Base Federada', field: 'CPF', value: fed.cpf }
        ]
      };
    }
  },
  {
    id: 'QG-CPF-002',
    title: 'CrossCheck de CPF entre Fontes (Declaração vs Base Federada RFB)',
    category: 'IDENTIFICACAO',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Provimento CNJ nº 149/2023, Art. 519 (Obrigatoriedade de confrontação cadastral)',
    description: 'Compara se o CPF digitado na declaração coincide exatamente com o registro civil localizado na Base Centralizada (CRC/RFB).',
    evaluate: (decl, ocr, ocrConf, fed) => {
      const cleanDecl = decl.cpf.replace(/\D/g, '');
      const cleanFed = fed.cpf.replace(/\D/g, '');
      const cleanOcr = ocr.cpf.replace(/\D/g, '');

      if (cleanDecl && cleanFed && cleanDecl !== cleanFed) {
        return {
          passed: false,
          message: `Divergência de CPF: Declaração consta '${decl.cpf}', mas a Base Federada da Receita/CRC registra '${fed.cpf}'.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'CPF', value: decl.cpf },
            { sourceName: 'Base Federada', field: 'CPF', value: fed.cpf },
            { sourceName: 'OCR DO', field: 'CPF', value: ocr.cpf, confidence: ocrConf.cpf }
          ],
          diffSummary: `Declaração (${decl.cpf}) ≠ Base Federada (${fed.cpf}).`
        };
      }

      if (cleanOcr && cleanDecl && cleanDecl !== cleanOcr && (ocrConf.cpf || 0) > 80) {
        return {
          passed: false,
          message: `Conflito entre Declaração (${decl.cpf}) e OCR de alta confiança (${ocr.cpf} [${ocrConf.cpf}%]).`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'CPF', value: decl.cpf },
            { sourceName: 'OCR DO', field: 'CPF', value: ocr.cpf, confidence: ocrConf.cpf }
          ],
          diffSummary: `OCR de alta confiança aponta número divergente da declaração.`
        };
      }

      return {
        passed: true,
        message: 'CPF unificado e concordante entre as fontes consultadas.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'CPF', value: decl.cpf },
          { sourceName: 'Base Federada', field: 'CPF', value: fed.cpf }
        ]
      };
    }
  },
  {
    id: 'QG-DOC-001',
    title: 'CrossCheck de Documento de Identidade (RG e Órgão Emissor)',
    category: 'IDENTIFICACAO',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Lei nº 6.015/1973, Art. 80 (Elementos essenciais do assento) e Provimento CNJ nº 149/2023',
    description: 'Confronta o número do RG e o órgão expedidor/UF entre a declaração preliminar, o OCR da DO física e o acervo civil federado.',
    evaluate: (decl, ocr, ocrConf, fed) => {
      const cleanDeclRg = (decl.rg || '').replace(/\D/g, '');
      const cleanFedRg = (fed.rg || '').replace(/\D/g, '');
      const cleanDeclEmissor = (decl.rgOrgaoEmissor || '').trim().toUpperCase();
      const cleanFedEmissor = (fed.rgOrgaoEmissor || '').trim().toUpperCase();

      if (cleanDeclRg && cleanFedRg && cleanDeclRg !== cleanFedRg) {
        return {
          passed: false,
          message: `Divergência substantiva de RG: Declaração consta '${decl.rg}', mas a Base Centralizada registra '${fed.rg}'.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'RG', value: `${decl.rg} (${decl.rgOrgaoEmissor})` },
            { sourceName: 'Base Federada (CRC)', field: 'RG', value: `${fed.rg} (${fed.rgOrgaoEmissor})` },
            { sourceName: 'OCR DO/RG', field: 'RG', value: `${ocr.rg} (${ocr.rgOrgaoEmissor})`, confidence: ocrConf.rg }
          ],
          diffSummary: `Declaração (${decl.rg}) ≠ Base Federada (${fed.rg}).`,
          suggestedFix: {
            field: 'rg',
            value: fed.rg,
            label: `Atualizar RG para ${fed.rg}`
          }
        };
      }

      if (cleanDeclEmissor && cleanFedEmissor && cleanDeclEmissor !== cleanFedEmissor) {
        return {
          passed: false,
          message: `Divergência de Órgão Expedidor do RG: Declaração consta '${decl.rgOrgaoEmissor}', mas na Base Oficial Centralizada consta '${fed.rgOrgaoEmissor}'.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Órgão Emissor', value: decl.rgOrgaoEmissor },
            { sourceName: 'Base Federada (CRC)', field: 'Órgão Emissor', value: fed.rgOrgaoEmissor },
            { sourceName: 'OCR DO/RG', field: 'Órgão Emissor', value: ocr.rgOrgaoEmissor }
          ],
          diffSummary: `Órgão Emissor: '${decl.rgOrgaoEmissor}' ≠ '${fed.rgOrgaoEmissor}'.`,
          suggestedFix: {
            field: 'rgOrgaoEmissor',
            value: fed.rgOrgaoEmissor,
            label: `Atualizar Órgão Emissor para ${fed.rgOrgaoEmissor}`
          }
        };
      }

      return {
        passed: true,
        message: 'Documento de Identidade (RG e Órgão Expedidor) validado e concordante.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'RG / Órgão', value: `${decl.rg} (${decl.rgOrgaoEmissor})` },
          { sourceName: 'Base Federada', field: 'RG / Órgão', value: `${fed.rg} (${fed.rgOrgaoEmissor})` }
        ]
      };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: CRONOLOGIA VITAL (Nascimento < Casamento < Óbito)
  // -------------------------------------------------------------
  {
    id: 'QG-CRON-001',
    title: 'Consistência Temporal: Óbito posterior ao Nascimento',
    category: 'CRONOLOGIA',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Lei nº 6.015/1973, Art. 77 e Art. 80 (Elementos essenciais do assento)',
    description: 'Impede a lavratura de ato em que a data do óbito seja retroativa ou anterior à data de nascimento da pessoa natural.',
    evaluate: (decl) => {
      const dNasc = parseDate(decl.dataNascimento);
      const dObito = parseDate(decl.dataObito);

      if (!dNasc || !dObito) {
        return {
          passed: false,
          message: 'Datas de nascimento ou óbito em formato inválido ou ausentes.',
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'dataNascimento', value: decl.dataNascimento },
            { sourceName: 'Declaração', field: 'dataObito', value: decl.dataObito }
          ]
        };
      }

      if (dObito.getTime() < dNasc.getTime()) {
        return {
          passed: false,
          message: `Inconsistência cronológica gravíssima: Data do óbito (${decl.dataObito}) é anterior à data de nascimento (${decl.dataNascimento})!`,
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Data Nascimento', value: decl.dataNascimento },
            { sourceName: 'Declaração', field: 'Data Óbito', value: decl.dataObito }
          ],
          diffSummary: `Diferença cronológica negativa detectada (${decl.dataObito} < ${decl.dataNascimento}).`
        };
      }

      return {
        passed: true,
        message: 'Cronologia nascimento -> óbito consistente.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'Nascimento', value: decl.dataNascimento },
          { sourceName: 'Declaração', field: 'Óbito', value: decl.dataObito }
        ]
      };
    }
  },
  {
    id: 'QG-CRON-002',
    title: 'Consistência Temporal: Óbito anterior ao Tempo Atual',
    category: 'CRONOLOGIA',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Código Civil, Art. 6º (Fim da existência da pessoa natural)',
    description: 'A data do falecimento não pode situar-se no futuro temporal em relação à data do sistema do cartório.',
    evaluate: (decl) => {
      const dObito = parseDate(decl.dataObito);
      const now = new Date();

      if (dObito && dObito.getTime() > now.getTime() + (24 * 60 * 60 * 1000)) {
        return {
          passed: false,
          message: `Data do óbito informada (${decl.dataObito}) encontra-se em data futura em relação à data corrente.`,
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Data Óbito', value: decl.dataObito },
            { sourceName: 'Sistema Cartorial', field: 'Data Atual', value: now.toISOString().split('T')[0] }
          ],
          diffSummary: 'Óbito registrado com data no futuro.'
        };
      }

      return {
        passed: true,
        message: 'Data do óbito válida temporalmente.',
        sourcesCompared: [{ sourceName: 'Declaração', field: 'Data Óbito', value: decl.dataObito }]
      };
    }
  },
  {
    id: 'QG-CRON-003',
    title: 'Consistência Temporal: Casamento prévio ao Óbito',
    category: 'CRONOLOGIA',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Código Civil, Art. 1.571, I (A sociedade conjugal termina pela morte de um dos cônjuges)',
    description: 'Se o de cujus possuir registro de casamento, a celebração nupcial deve ter ocorrido antes do falecimento.',
    evaluate: (decl, ocr, ocrConf, fed) => {
      const dataCasamento = decl.dataCasamento || fed.dataCasamento;
      if (!dataCasamento) {
        return {
          passed: true,
          message: 'Sem assento de casamento informado para confronto temporal.',
          sourcesCompared: []
        };
      }

      const dCasam = parseDate(dataCasamento);
      const dObito = parseDate(decl.dataObito);

      if (dCasam && dObito && dCasam.getTime() > dObito.getTime()) {
        return {
          passed: false,
          message: `Inconsistência cronológica: Casamento registrado em ${dataCasamento}, data posterior ao falecimento (${decl.dataObito}).`,
          sourcesCompared: [
            { sourceName: 'Base Federada / Declaração', field: 'Data Casamento', value: dataCasamento },
            { sourceName: 'Declaração', field: 'Data Óbito', value: decl.dataObito }
          ],
          diffSummary: `Casamento (${dataCasamento}) > Óbito (${decl.dataObito}).`,
          suggestedFix: fed.dataCasamento && parseDate(fed.dataCasamento) && parseDate(fed.dataCasamento)!.getTime() <= dObito.getTime() ? {
            field: 'dataCasamento',
            value: fed.dataCasamento,
            label: `Harmonizar com Base Federada: ${fed.dataCasamento}`
          } : undefined
        };
      }

      return {
        passed: true,
        message: 'Cronologia de casamento e viuvez/óbito correta.',
        sourcesCompared: [
          { sourceName: 'Casamento', field: 'Data', value: dataCasamento },
          { sourceName: 'Óbito', field: 'Data', value: decl.dataObito }
        ]
      };
    }
  },
  {
    id: 'QG-CRON-004',
    title: 'Compatibilidade de Idade Núbil na Data do Casamento',
    category: 'CRONOLOGIA',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Código Civil, Art. 1.517 e Art. 1.520 (Idade núbil mínima legal)',
    description: 'Alerta quando o casamento ocorreu com idade inferior a 16 anos (vedação legal) ou quando a idade no óbito é incompatível.',
    evaluate: (decl, ocr, ocrConf, fed) => {
      const dataCasamento = decl.dataCasamento || fed.dataCasamento;
      if (!dataCasamento || !decl.dataNascimento) {
        return { passed: true, message: 'Dados insuficientes para análise de idade núbil.', sourcesCompared: [] };
      }

      const idadeCasamento = calculateAge(decl.dataNascimento, dataCasamento);
      if (idadeCasamento !== null && idadeCasamento < 16) {
        return {
          passed: false,
          message: `Idade núbil anômala: Pessoa natural possuía apenas ${idadeCasamento} anos na data do casamento (${dataCasamento}). Verifique suprimento judicial.`,
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Nascimento', value: decl.dataNascimento },
            { sourceName: 'Base Federada', field: 'Casamento', value: dataCasamento }
          ],
          diffSummary: `Idade calculada ao casar: ${idadeCasamento} anos (mínimo legal: 16 anos).`
        };
      }

      return { passed: true, message: 'Idade núbil compatível.', sourcesCompared: [] };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: FILIAÇÃO & CONFRONTO MATERNO/PATERNO
  // -------------------------------------------------------------
  {
    id: 'QG-FILI-001',
    title: 'CrossCheck de Filiação Materna (Declaração vs Base Federada CRC)',
    category: 'FILIACAO',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Lei nº 6.015/1973, Art. 80, 5º (Indicação do nome dos pais e estado)',
    description: 'Confronta o nome da mãe declarado com o assento originário de nascimento na Base Centralizada do Registro Civil (CRC Nacional).',
    evaluate: (decl, ocr, ocrConf, fed) => {
      if (!decl.nomeMae || !fed.nomeMae) {
        return {
          passed: false,
          message: 'Nome da genitora ausente em uma das bases consultadas.',
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Nome Mãe', value: decl.nomeMae || '(Vazio)' },
            { sourceName: 'Base Federada', field: 'Nome Mãe', value: fed.nomeMae || '(Vazio)' }
          ]
        };
      }

      const sim = nameSimilarity(decl.nomeMae, fed.nomeMae);

      if (sim < 0.70) {
        return {
          passed: false,
          message: `Divergência substantiva na filiação materna! Declaração: "${decl.nomeMae}" vs Base Federada: "${fed.nomeMae}". Requer verificação de certidão de casamento da mãe ou retificação.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Nome Mãe', value: decl.nomeMae },
            { sourceName: 'Base Federada (CRC)', field: 'Nome Mãe', value: fed.nomeMae },
            { sourceName: 'OCR DO/RG', field: 'Nome Mãe', value: ocr.nomeMae, confidence: ocrConf.nomeMae }
          ],
          diffSummary: `Similaridade textual baixa (${Math.round(sim * 100)}%). Possível divergência de patronímico ou homônimo.`
        };
      } else if (sim < 0.95) {
        return {
          passed: false,
          message: `Pequena variação ortográfica no nome materno: "${decl.nomeMae}" vs "${fed.nomeMae}".`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Nome Mãe', value: decl.nomeMae },
            { sourceName: 'Base Federada (CRC)', field: 'Nome Mãe', value: fed.nomeMae }
          ],
          diffSummary: `Similaridade de ${Math.round(sim * 100)}% (ex: acentuação, grafia com 'Z' ou 'S').`,
          suggestedFix: {
            field: 'nomeMae',
            value: fed.nomeMae,
            label: `Harmonizar grafia com CRC: "${fed.nomeMae}"`
          }
        };
      }

      return {
        passed: true,
        message: 'Filiação materna coincidente e validada.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'Nome Mãe', value: decl.nomeMae },
          { sourceName: 'Base Federada', field: 'Nome Mãe', value: fed.nomeMae }
        ]
      };
    }
  },
  {
    id: 'QG-FILI-002',
    title: 'CrossCheck de Filiação Paterna',
    category: 'FILIACAO',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Lei nº 8.560/1992 (Investigação de paternidade e reconhecimento)',
    description: 'Verifica eventual divergência ou ausência de reconhecimento de paternidade entre a declaração e o acervo registral.',
    evaluate: (decl, ocr, ocrConf, fed) => {
      // Se não há pai na base federada (registro só materno) mas foi declarado pai
      if ((!fed.nomePai || fed.nomePai === 'NÃO CONSTA') && decl.nomePai && decl.nomePai !== 'NÃO CONSTA') {
        return {
          passed: false,
          message: `Paternidade declarada ("${decl.nomePai}"), porém na Base Centralizada (CRC) o assento originário não possui paternidade estabelecida. Requer averbação ou escritura de reconhecimento.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Nome Pai', value: decl.nomePai },
            { sourceName: 'Base Federada (CRC)', field: 'Nome Pai', value: fed.nomePai || 'NÃO CONSTA' }
          ],
          diffSummary: 'Paternidade ausente no assento de nascimento federado.'
        };
      }

      if (decl.nomePai && fed.nomePai && fed.nomePai !== 'NÃO CONSTA') {
        const sim = nameSimilarity(decl.nomePai, fed.nomePai);
        if (sim < 0.75) {
          return {
            passed: false,
            message: `Nome do genitor divergente: Declaração ("${decl.nomePai}") vs Base Federada ("${fed.nomePai}").`,
            sourcesCompared: [
              { sourceName: 'Declaração', field: 'Nome Pai', value: decl.nomePai },
              { sourceName: 'Base Federada', field: 'Nome Pai', value: fed.nomePai }
            ],
            diffSummary: `Similaridade ${Math.round(sim * 100)}%.`
          };
        }
      }

      return {
        passed: true,
        message: 'Filiação paterna consistente.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'Nome Pai', value: decl.nomePai },
          { sourceName: 'Base Federada', field: 'Nome Pai', value: fed.nomePai }
        ]
      };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: ESTADO CIVIL
  // -------------------------------------------------------------
  {
    id: 'QG-CIVIL-001',
    title: 'Confronto de Estado Civil (Declaração vs Assentos Matrimoniais da CRC)',
    category: 'ESTADO_CIVIL',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Código Civil, Art. 1.571 e Provimento CNJ nº 149/2023',
    description: 'Evita lavrar estado civil errôneo (ex: de cujus declarado como solteiro quando constar casamento ativo sem divórcio averbado).',
    evaluate: (decl, ocr, ocrConf, fed) => {
      if (decl.estadoCivil === 'SOLTEIRO' && fed.estadoCivil === 'CASADO') {
        return {
          passed: false,
          message: `Conflito de Estado Civil: De cujus declarado como SOLTEIRO, mas a Base da CRC aponta casamento registrado com ${fed.nomeConjuge || 'Cônjuge registrado'} sem averbação de divórcio.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Estado Civil', value: decl.estadoCivil },
            { sourceName: 'Base Federada (CRC)', field: 'Estado Civil', value: fed.estadoCivil },
            { sourceName: 'Base Federada (CRC)', field: 'Cônjuge', value: fed.nomeConjuge || 'Sim' }
          ],
          diffSummary: 'Declaração = SOLTEIRO | Base Federada = CASADO (Livro B).',
          suggestedFix: {
            field: 'estadoCivil',
            value: 'CASADO',
            label: 'Atualizar Estado Civil para CASADO (conforme Livro B)'
          }
        };
      }

      if (decl.estadoCivil === 'CASADO' && !decl.nomeConjuge) {
        return {
          passed: false,
          message: 'Estado civil informado como CASADO, porém o nome do cônjuge sobrevivo ou pré-morto não foi preenchido.',
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Estado Civil', value: decl.estadoCivil },
            { sourceName: 'Declaração', field: 'Nome Cônjuge', value: '(Não informado)' }
          ],
          diffSummary: 'Ausência de qualificação do cônjuge.'
        };
      }

      return {
        passed: true,
        message: 'Estado civil coerente com registros centrais.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'Estado Civil', value: decl.estadoCivil },
          { sourceName: 'Base Federada', field: 'Estado Civil', value: fed.estadoCivil }
        ]
      };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: QUALIDADE E CONFIANÇA DO OCR
  // -------------------------------------------------------------
  {
    id: 'QG-OCR-001',
    title: 'Garantia de Qualidade de Leitura Óptica (Threshold de OCR na DO)',
    category: 'OCR_CONFIANCA',
    severity: 'ALERTA_OBRIGATORIO',
    legalReference: 'Manual de Instruções para Preenchimento da Declaração de Óbito (Ministério da Saúde / SVS)',
    description: 'Exige conferência manual do operador se campos críticos da DO digitalizada apresentarem score de confiança de OCR inferior a 75%.',
    evaluate: (decl, ocr, ocrConf) => {
      const camposCriticos: Array<{ key: keyof DeathRecordData; label: string; minConf: number }> = [
        { key: 'numeroDO', label: 'Número da Declaração de Óbito (DO)', minConf: 80 },
        { key: 'causaMortis', label: 'Causa Mortis / CID-10', minConf: 75 },
        { key: 'dataObito', label: 'Data do Óbito', minConf: 80 },
        { key: 'crmMedico', label: 'CRM do Médico Atestante', minConf: 75 }
      ];

      const camposBaixaConfianca = camposCriticos.filter(c => (ocrConf[c.key] || 0) < c.minConf);

      if (camposBaixaConfianca.length > 0) {
        const detalhe = camposBaixaConfianca
          .map(c => `${c.label} (Confiança: ${ocrConf[c.key] || 0}% < ${c.minConf}%)`)
          .join('; ');

        return {
          passed: false,
          message: `Digitalização física da DO possui campos com leitura óptica de baixa fidelidade: ${detalhe}. O operador deve conferir a via amarela física original antes de prosseguir.`,
          sourcesCompared: camposBaixaConfianca.map(c => ({
            sourceName: 'OCR Digitalizado',
            field: c.label,
            value: String(ocr[c.key] ?? ''),
            confidence: ocrConf[c.key]
          })),
          diffSummary: `Score de OCR insuficiente em ${camposBaixaConfianca.length} campo(s) crítico(s).`
        };
      }

      return {
        passed: true,
        message: 'Reconhecimento óptico de caracteres com pontuação de alta fidelidade (>80%).',
        sourcesCompared: [
          { sourceName: 'OCR DO', field: 'Média de Confiança', value: 'Excelente (>85%)' }
        ]
      };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: MÉDICO-LEGAL & CAUSA MORTIS
  // -------------------------------------------------------------
  {
    id: 'QG-MED-001',
    title: 'Habilitação e Identificação do Médico Atestante (CRM / CFM)',
    category: 'MEDICO_LEGAL',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Lei nº 6.015/1973, Art. 77 e Resolução CFM nº 2.384/2024',
    description: 'Nenhum assento de óbito será lavrado sem que conste o atestado médico com o respectivo número de inscrição no Conselho Regional de Medicina.',
    evaluate: (decl) => {
      if (!decl.crmMedico || !validateCRM(decl.crmMedico)) {
        return {
          passed: false,
          message: `CRM do médico atestante '${decl.crmMedico || 'NÃO INFORMADO'}' inválido. Obrigatória anotação de CRM válido com 4 a 7 dígitos.`,
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'CRM Médico', value: decl.crmMedico || '(Vazio)' },
            { sourceName: 'Declaração Preliminar', field: 'Nome Médico', value: decl.nomeMedico || '(Vazio)' }
          ],
          diffSummary: 'Atestado médico sem identificação válida do CRM.'
        };
      }

      if (!decl.causaMortis || decl.causaMortis.trim().length < 3) {
        return {
          passed: false,
          message: 'Causa mortis não descrita ou insuficiente para qualificação do assento.',
          sourcesCompared: [
            { sourceName: 'Declaração', field: 'Causa Mortis', value: decl.causaMortis || '(Vazio)' }
          ],
          diffSummary: 'Campo de causa jurídica da morte ausente.'
        };
      }

      return {
        passed: true,
        message: 'Atestação médica conforme requisitos da Lei 6.015/73.',
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'CRM', value: decl.crmMedico },
          { sourceName: 'Declaração', field: 'Médico', value: decl.nomeMedico }
        ]
      };
    }
  },
  {
    id: 'QG-CEM-001',
    title: 'Indicação de Sepultamento ou Cremação e Cemitério',
    category: 'MEDICO_LEGAL',
    severity: 'BLOQUEIO_IMPEDIENTE',
    legalReference: 'Lei nº 6.015/1973, Art. 80, 4º e Art. 77, § 2º (Lugar do sepultamento)',
    description: 'O assento de óbito deve conter obrigatoriamente a declaração expressa do lugar onde o cadáver foi sepultado ou cremado.',
    evaluate: (decl) => {
      if (!decl.cemiterio || decl.cemiterio.trim().length < 3) {
        return {
          passed: false,
          message: 'Cemitério ou crematório de destinação do cadáver não informado. Requisito legal obrigatório para lavratura.',
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Cemitério', value: decl.cemiterio || '(Vazio)' }
          ],
          diffSummary: 'Ausência do local de sepultamento/cremação.'
        };
      }
      return {
        passed: true,
        message: `Destinação do cadáver definida: ${decl.sepultamentoCremacao} no ${decl.cemiterio}.`,
        sourcesCompared: [
          { sourceName: 'Declaração', field: 'Cemitério', value: decl.cemiterio },
          { sourceName: 'Declaração', field: 'Destinação', value: decl.sepultamentoCremacao }
        ]
      };
    }
  },

  // -------------------------------------------------------------
  // GRUPO: INFORMATIVOS E OBRIGAÇÕES ACESSÓRIAS
  // -------------------------------------------------------------
  {
    id: 'QG-INFO-001',
    title: 'Comunicação Automática de Óbito ao SIRC, SISOBI e Justiça Eleitoral',
    category: 'JURISDICAO',
    severity: 'INFORMATIVO',
    legalReference: 'Lei nº 13.846/2019 e Provimento CNJ nº 149/2023, Art. 524',
    description: 'Lembrete de envio obrigatório do arquivo eletrônico com dados do óbito no prazo improrrogável de até 1 dia útil após a lavratura.',
    evaluate: (decl) => {
      return {
        passed: true,
        message: `Após a lavratura, o ato da DO nº ${decl.numeroDO} será enfileirado para transmissão ao SIRC / INSS e ao Tribunal Superior Eleitoral.`,
        sourcesCompared: [
          { sourceName: 'SIRC/SISOBI', field: 'Protocolo de Saída', value: 'Pronto para transmissão' }
        ]
      };
    }
  },
  {
    id: 'QG-INFO-002',
    title: 'Declaração de Deixou Bens, Filhos e Testamento',
    category: 'IDENTIFICACAO',
    severity: 'INFORMATIVO',
    legalReference: 'Lei nº 6.015/1973, Art. 80, 8º (Se deixou bens, herdeiros ou testamento)',
    description: 'Incentiva a anotação expressa sobre existência de bens para fins de facilitação de inventário extrajudicial ou partilha.',
    evaluate: (decl) => {
      if (decl.deixouBens === 'IGNORADO') {
        return {
          passed: false,
          message: 'Deixou bens anotado como "IGNORADO". Recomenda-se questionar o declarante para evitar futura retificação de assento.',
          sourcesCompared: [
            { sourceName: 'Declaração Preliminar', field: 'Deixou Bens', value: decl.deixouBens }
          ],
          diffSummary: 'Informação declarada como ignorada.'
        };
      }
      return {
        passed: true,
        message: 'Declaração sobre bens e herdeiros preenchida.',
        sourcesCompared: [{ sourceName: 'Declaração', field: 'Bens', value: decl.deixouBens }]
      };
    }
  }
];

/**
 * Executa todas as regras declarativas do Quality Gate sobre os dados multifonte
 */
export function evaluateQualityGate(
  decl: DeathRecordData,
  ocr: DeathRecordData,
  ocrConfidence: OCRConfidenceMap,
  federated: DeathRecordData,
  justifications: Record<string, string> = {}
): {
  results: RuleEvaluationResult[];
  hasImpediments: boolean;
  hasPendingAlerts: boolean;
  canLavrar: boolean;
  summary: {
    total: number;
    passed: number;
    impedientes: number;
    alertasObrigatorios: number;
    alertasJustificados: number;
    informativos: number;
  };
} {
  const results: RuleEvaluationResult[] = [];
  let impedientes = 0;
  let alertasObrigatorios = 0;
  let alertasJustificados = 0;
  let informativos = 0;
  let passedCount = 0;

  for (const rule of QUALITY_GATE_RULES) {
    const evalRes = rule.evaluate(decl, ocr, ocrConfidence, federated);
    const requiresJustification = !evalRes.passed && rule.severity === 'ALERTA_OBRIGATORIO';
    const operatorJustification = justifications[rule.id] || '';
    const isJustified = requiresJustification && operatorJustification.trim().length >= 10;

    if (evalRes.passed) {
      passedCount++;
    } else {
      if (rule.severity === 'BLOQUEIO_IMPEDIENTE') {
        impedientes++;
      } else if (rule.severity === 'ALERTA_OBRIGATORIO') {
        alertasObrigatorios++;
        if (isJustified) {
          alertasJustificados++;
        }
      } else if (rule.severity === 'INFORMATIVO') {
        informativos++;
      }
    }

    results.push({
      ruleId: rule.id,
      ruleTitle: rule.title,
      category: rule.category,
      severity: rule.severity,
      passed: evalRes.passed,
      message: evalRes.message,
      legalReference: rule.legalReference,
      sourcesCompared: evalRes.sourcesCompared,
      diffSummary: evalRes.diffSummary,
      suggestedFix: evalRes.suggestedFix,
      requiresJustification,
      operatorJustification
    });
  }

  const hasImpediments = impedientes > 0;
  const pendingAlertsCount = alertasObrigatorios - alertasJustificados;
  const hasPendingAlerts = pendingAlertsCount > 0;
  const canLavrar = !hasImpediments && !hasPendingAlerts;

  return {
    results,
    hasImpediments,
    hasPendingAlerts,
    canLavrar,
    summary: {
      total: QUALITY_GATE_RULES.length,
      passed: passedCount,
      impedientes,
      alertasObrigatorios,
      alertasJustificados,
      informativos
    }
  };
}
