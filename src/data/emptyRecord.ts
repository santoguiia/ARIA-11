import { DeathRecordData, OCRConfidenceMap, CaseScenario } from '../types';

export function createEmptyDeathRecordData(): DeathRecordData {
  return {
    numeroDO: '',
    nomeFalecido: '',
    cpf: '',
    rg: '',
    rgOrgaoEmissor: '',
    dataNascimento: '',
    sexo: '',
    corRaca: '',
    estadoCivil: '',
    dataCasamento: '',
    nomeConjuge: '',
    nomeMae: '',
    nomePai: '',
    dataObito: '',
    horaObito: '',
    localObito: '',
    tipoLocal: '',
    municipioObito: '',
    ufObito: '',
    causaMortis: '',
    cid10: '',
    nomeMedico: '',
    crmMedico: '',
    ufCrm: '',
    sepultamentoCremacao: '',
    cemiterio: '',
    deixouBens: '',
    deixouTestamento: '',
    deixouFilhos: '',
    qtdFilhos: 0,
    nomesFilhos: '',
    nomeDeclarante: '',
    qualificacaoDeclarante: '',
    naturalidadeMunicipio: '',
    naturalidadeUf: '',
    ocupacao: '',
    escolaridade: '',
    enderecoResidencia: '',
    bairroResidencia: '',
    municipioResidencia: '',
    ufResidencia: '',
    cepResidencia: '',
    estabelecimentoObito: '',
    dataAtestadoMedico: '',
    cartorioNome: '',
    registroTermo: ''
  };
}

export function createEmptyOCRConfidence(): OCRConfidenceMap {
  const empty = createEmptyDeathRecordData();
  const map: Partial<OCRConfidenceMap> = {};
  for (const key of Object.keys(empty) as (keyof DeathRecordData)[]) {
    map[key] = 0;
  }
  return map as OCRConfidenceMap;
}

export const EMPTY_PRODUCTION_SCENARIO: CaseScenario = {
  id: 'PROD_NOVA_LAVRATURA',
  title: 'Nova Lavratura em Branco (Ambiente de Produção)',
  shortDesc: 'Formulários limpos para entrada e qualificação de dados reais de declaração, OCR2Act e Barramentos Federados.',
  tag: 'CONFORME',
  tagColor: 'emerald',
  dadosDeclaracao: createEmptyDeathRecordData(),
  dadosOCR: createEmptyDeathRecordData(),
  ocrConfidence: createEmptyOCRConfidence(),
  dadosFederados: createEmptyDeathRecordData()
};
