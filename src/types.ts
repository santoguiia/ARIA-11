export type RuleSeverity = 'INFORMATIVO' | 'ALERTA_OBRIGATORIO' | 'BLOQUEIO_IMPEDIENTE';

export type RuleCategory = 
  | 'CRONOLOGIA' 
  | 'IDENTIFICACAO' 
  | 'FILIACAO' 
  | 'ESTADO_CIVIL' 
  | 'OCR_CONFIANCA' 
  | 'MEDICO_LEGAL'
  | 'JURISDICAO';

export interface DeathRecordData {
  numeroDO: string;
  nomeFalecido: string;
  cpf: string;
  rg: string;
  rgOrgaoEmissor: string;
  dataNascimento: string;
  sexo: 'M' | 'F' | 'I';
  corRaca: 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA';
  estadoCivil: 'SOLTEIRO' | 'CASADO' | 'VIUVO' | 'VIUVA' | 'DIVORCIADO' | 'SEPARADO_JUDICIALMENTE';
  dataCasamento?: string;
  nomeConjuge?: string;
  nomeMae: string;
  nomePai: string;
  dataObito: string;
  horaObito: string;
  localObito: string;
  tipoLocal: 'HOSPITAL' | 'DOMICILIO' | 'VIA_PUBLICA' | 'OUTROS';
  municipioObito: string;
  ufObito: string;
  causaMortis: string;
  cid10: string;
  nomeMedico: string;
  crmMedico: string;
  ufCrm: string;
  sepultamentoCremacao: string;
  cemiterio: string;
  deixouBens: 'SIM' | 'NAO' | 'IGNORADO';
  deixouTestamento: 'SIM' | 'NAO' | 'IGNORADO';
  deixouFilhos: 'SIM' | 'NAO' | 'IGNORADO';
  qtdFilhos?: number;
  nomesFilhos?: string;
  nomeDeclarante: string;
  qualificacaoDeclarante: string;
}

export type OCRConfidenceMap = Record<keyof DeathRecordData, number>;

export interface SourceValue {
  sourceName: string;
  field: string;
  value: string;
  confidence?: number;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleTitle: string;
  category: RuleCategory;
  severity: RuleSeverity;
  passed: boolean;
  message: string;
  legalReference: string;
  sourcesCompared: SourceValue[];
  diffSummary?: string;
  requiresJustification: boolean;
  operatorJustification?: string;
}

export interface QualityGateRule {
  id: string;
  title: string;
  category: RuleCategory;
  severity: RuleSeverity;
  legalReference: string;
  description: string;
  evaluate: (
    decl: DeathRecordData,
    ocr: DeathRecordData,
    ocrConfidence: OCRConfidenceMap,
    federated: DeathRecordData
  ) => {
    passed: boolean;
    message: string;
    sourcesCompared: SourceValue[];
    diffSummary?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operador: string;
  matricula: string;
  cartorio: string;
  action: 'EVALUATION' | 'JUSTIFICATION_SUBMITTED' | 'LAVRATURA_APROVADA' | 'LAVRATURA_BLOQUEADA' | 'MANUAL_EDIT' | 'SCENARIO_LOADED';
  resumo: string;
  sha256Hash: string;
  previousHash: string;
  rulesFailingCount: {
    impedientes: number;
    alertas: number;
    informativos: number;
  };
  justifications?: Record<string, string>;
  snapshotData?: {
    numeroDO: string;
    nomeFalecido: string;
    cpf: string;
  };
}

export interface CaseScenario {
  id: string;
  title: string;
  shortDesc: string;
  tag: 'CRITICO' | 'ALERTA' | 'CONFORME' | 'DIVERGENCIA';
  tagColor: string;
  dadosDeclaracao: DeathRecordData;
  dadosOCR: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
  dadosFederados: DeathRecordData;
}
