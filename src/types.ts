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
  sexo: 'M' | 'F' | 'I' | '';
  corRaca: 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | '';
  estadoCivil: 'SOLTEIRO' | 'CASADO' | 'VIUVO' | 'VIUVA' | 'DIVORCIADO' | 'SEPARADO_JUDICIALMENTE' | '';
  dataCasamento?: string;
  nomeConjuge?: string;
  nomeMae: string;
  nomePai: string;
  dataObito: string;
  horaObito: string;
  localObito: string;
  tipoLocal: 'HOSPITAL' | 'DOMICILIO' | 'VIA_PUBLICA' | 'OUTROS' | '';
  municipioObito: string;
  ufObito: string;
  causaMortis: string;
  cid10: string;
  nomeMedico: string;
  crmMedico: string;
  ufCrm: string;
  sepultamentoCremacao: string;
  cemiterio: string;
  deixouBens: 'SIM' | 'NAO' | 'IGNORADO' | '';
  deixouTestamento: 'SIM' | 'NAO' | 'IGNORADO' | '';
  deixouFilhos: 'SIM' | 'NAO' | 'IGNORADO' | '';
  qtdFilhos?: number;
  nomesFilhos?: string;
  nomeDeclarante: string;
  qualificacaoDeclarante: string;

  // Informações da Base Federada / Registro Civil SIRC
  matricula?: string;
  cnsCartorio?: string;
  cartorioNome?: string;
  cartorioEndereco?: string;
  oficialRegistro?: string;
  escreventeRegistro?: string;
  cargoOficial?: string;
  dataEmissaoCertidao?: string;
  municipioEmissao?: string;
  ufEmissao?: string;
  anotacoesAverbacoes?: string;
  idadeFalecido?: number;
  naturalidadeMunicipio?: string;
  naturalidadeUf?: string;
  ocupacao?: string;
  escolaridade?: string;
  registroTermo?: string;
  enderecoResidencia?: string;
  bairroResidencia?: string;
  municipioResidencia?: string;
  ufResidencia?: string;
  cepResidencia?: string;
  estabelecimentoObito?: string;
  dataAtestadoMedico?: string;
  tipoObito?: string;
}

export type OCRConfidenceMap = Partial<Record<keyof DeathRecordData, number>> & Record<string, number>;

export interface OCRBoundingBox {
  x: number; // percent 0-100
  y: number; // percent 0-100
  w: number; // percent 0-100
  h: number; // percent 0-100
  // Coordenadas absolutas em píxeis na imagem nativa (precisão espacial estrita)
  pixelX0?: number;
  pixelY0?: number;
  pixelX1?: number;
  pixelY1?: number;
}

export type DocumentClassificationType = 
  | 'DECLARACAO_OBITO' 
  | 'CERTIDAO_OBITO' 
  | 'RG_IDENTIDADE' 
  | 'DESCONHECIDO';

export interface DocumentClassificationWarning {
  severity: 'BLOQUEIO' | 'ALERTA' | 'INFO';
  title: string;
  message: string;
  recommendation: string;
}

export interface DocumentValidationResult {
  type: DocumentClassificationType;
  typeName: string;
  confidence: number; // 0-100
  isCompatibleDO: boolean;
  reason?: string;
  warningBanner?: DocumentClassificationWarning;
}

export interface OCRFieldExtraction {
  field: keyof DeathRecordData;
  label: string;
  value: string;
  confidence: number; // 0-100
  bbox: OCRBoundingBox;
  rawSnippet?: string;
  matchedAnchor?: string;
}

export interface OCRDocumentState {
  id: string;
  fileName: string;
  fileType: 'IMAGE' | 'PDF';
  imageUrl: string;
  extractedText: string;
  fields: Partial<Record<keyof DeathRecordData, OCRFieldExtraction>>;
  isProcessing: boolean;
  processingProgress: number; // 0-100
  processingStep: string;
  error?: string;
  timestamp?: string;
  imageDimensions?: {
    naturalWidth: number;
    naturalHeight: number;
  };
  classification?: DocumentValidationResult;
  engine?: string; // Motor de visão utilizado: Vision LLM (Multimodal) ou OCR Local
}

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
  suggestedFix?: {
    field: keyof DeathRecordData;
    value: string;
    label: string;
  };
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
    suggestedFix?: {
      field: keyof DeathRecordData;
      value: string;
      label: string;
    };
  };
}

export type BiometricCaptureType = 
  | 'POLEGAR_DIREITO' 
  | 'POLEGAR_ESQUERDO' 
  | 'ASSINATURA_DIGITAL_CAMERA' 
  | 'ASSINATURA_PAD_TOUCH'
  | 'FOTO_FACIAL_DECLARANTE';

export interface BiometricRecord {
  id: string;
  type: BiometricCaptureType;
  typeLabel: string;
  timestamp: string;
  declaranteNome: string;
  declaranteCpf?: string;
  declaranteQualificacao?: string;
  imageBase64: string;
  sha256Hash: string;
  cameraDeviceId?: string;
  cameraDeviceLabel?: string;
  operadorMatricula: string;
  operadorNome: string;
  cartorioCns?: string;
  statusConformidade: 'AUTENTICADA' | 'VERIFICADA';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operador: string;
  matricula: string;
  cartorio: string;
  action: 
    | 'EVALUATION' 
    | 'JUSTIFICATION_SUBMITTED' 
    | 'LAVRATURA_APROVADA' 
    | 'LAVRATURA_BLOQUEADA' 
    | 'MANUAL_EDIT' 
    | 'SCENARIO_LOADED' 
    | 'OPERADOR_LOGIN' 
    | 'OPERADOR_LOGOUT'
    | 'BIOMETRIC_CAPTURE'
    | 'SIGNATURE_ATTACHED';
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
  biometricRecord?: BiometricRecord;
}

export interface EscreventeUser {
  id: string;
  nome: string;
  cargo: 'ESCREVENTE_AUTORIZADO' | 'OFICIAL_TITULAR' | 'ESCREVENTE_SUBSTITUTO';
  cargoLabel: string;
  matricula: string;
  cpf: string;
  email: string;
  cartorio: string;
  cns: string;
  comarca: string;
  certificadoIcp: {
    tipo: 'A3 (Token USB Safenet)' | 'A3 (SmartCard)' | 'Nuvem (NeoID/SafeID)';
    serialNumber: string;
    emissor: string;
    validade: string;
    status: 'VÁLIDO / ATIVO';
  };
  loginMethod: 'CERTIFICADO_DIGITAL' | 'MATRICULA_SENHA';
  avatarInitials: string;
  loggedAt?: string;
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

export type FederatedBusId = 'CRC_NACIONAL' | 'ONR' | 'SIRC_SISOBI' | 'RECEITA_FEDERAL';

export interface FederatedBusStatus {
  id: FederatedBusId;
  name: string;
  acronym: string;
  legalBasis: string;
  endpoint: string;
  status: 'CONNECTED' | 'OFFLINE_CONTINGENCY' | 'CONNECTING' | 'ERROR';
  latencyMs: number;
  lastSync: string;
  tlsVersion: string;
  cipherSuite: string;
  verifiedFields: string[];
}

export interface CartorioCertificate {
  serventia: string;
  cns: string;
  titular: string;
  subject: string;
  issuer: string;
  validUntil: string;
  serialNumber: string;
  type: 'A1 (PKCS#12)' | 'A3 (Token Criptográfico FIPS-140-2)';
  ocspStatus: 'VÁLIDO / NÃO REVOGADO';
  lastHandshake: string;
}

export interface LocalFirstNodeStatus {
  runtime: string;
  platform: string;
  localDb: string;
  decisionEngine: string;
  auditLedger: string;
  contingencyMode: boolean;
  queuedSyncCount: number;
}

export type LicenseTier = 'BASIC' | 'PRO_AI' | 'ENTERPRISE_MTLS';

export interface LicenseInfo {
  isValid: boolean;
  tier: LicenseTier;
  tierLabel: string;
  features: string[];
  licenseKey: string;
  orgId: string;
  orgName: string;
  deviceHash: string;
  hwidFormatted: string;
  validUntil: string;
  daysRemaining: number;
  isWithinGrace: boolean;
  syncStatus: 'SYNCED_WITH_SAAS' | 'LOCAL_OFFLINE_VERIFIED' | 'OFFLINE_GRACE_PERIOD' | 'OFFLINE_CONTINGENCY' | 'SYNCING' | 'INITIALIZING';
  lastSyncDate: string | null;
  canUseLocalLLM: boolean;
  canUseFederatedMtls: boolean;
  asymmetricAlgorithm?: string;
  localDatabase?: string;
}

export interface LocalLLMStatus {
  isLoaded: boolean;
  modelPath?: string;
  existsOnDisk?: boolean;
  environment?: string;
  contextSizeLimit?: number;
  inactivityTimeoutMs?: number;
  idleTimeRemainingMs?: number;
  totalInferences?: number;
  engine?: string;
  targetArch?: string;
  platform?: string;
}

export interface LLMJustificationResult {
  success: boolean;
  justification?: string;
  tokensGenerated?: number;
  durationMs?: number;
  source?: string;
  contextSize?: number;
  inactivityTimeoutSec?: number;
  error?: string;
  requiredTier?: LicenseTier;
  message?: string;
}

export interface LLMMinutaResult {
  success: boolean;
  minuta?: string;
  durationMs?: number;
  source?: string;
  error?: string;
  requiredTier?: LicenseTier;
  message?: string;
}

export interface LLMOCRResult {
  success: boolean;
  source?: string;
  durationMs?: number;
  data?: {
    classification?: {
      type: string;
      typeName: string;
      confidence: number;
      isCompatibleDO: boolean;
      reason?: string;
    };
    fields?: Array<{
      field: string;
      label: string;
      value: string;
      confidence: number;
      box_2d: [number, number, number, number];
    }>;
    fullTranscribedText?: string;
  };
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isDesktop?: boolean;
      platform?: string;
      versions?: Record<string, string>;
      saveAuditLog?: (logEntry: any) => Promise<{ success: boolean; path?: string; hash?: string }>;
      saveReportTxt?: (textContent: string) => Promise<{ success: boolean; path?: string }>;
      getAuditLogs?: () => Promise<any[]>;
      exportPdfReport?: (reportData: any) => Promise<{ success: boolean; filePath?: string }>;
      testMtlsHandshake?: (busId?: string) => Promise<{ 
        success: boolean; 
        busId?: string; 
        latencyMs?: number; 
        tlsVersion?: string; 
        cipherSuite?: string; 
        timestamp?: string;
        error?: string;
        requiredTier?: LicenseTier;
        message?: string;
      }>;
      getNodeStatus?: () => Promise<any>;
      onMenuAction?: (callback: (action: string, data?: any) => void) => (() => void) | void;

      license?: {
        getStatus: () => Promise<LicenseInfo>;
        getMachineId: () => Promise<{ deviceHash: string; hwidFormatted: string }>;
        activate: (key: string) => Promise<{ success: boolean; license?: LicenseInfo; message?: string; error?: string }>;
        heartbeat: () => Promise<{ success: boolean; mode?: string }>;
      };

      llm?: {
        processOCR: (params: {
          imageBase64: string;
          mimeType?: string;
          fileName?: string;
        }) => Promise<LLMOCRResult>;
        generateJustification: (params: {
          ruleId: string;
          ruleTitle: string;
          legalReference: string;
          diffSummary?: string;
          declaracao: DeathRecordData;
          ocr: DeathRecordData;
          federada: DeathRecordData;
        }) => Promise<LLMJustificationResult>;
        draftMinuta: (params: {
          declaracao: DeathRecordData;
          justifications?: Record<string, string>;
        }) => Promise<LLMMinutaResult>;
        getStatus: () => Promise<LocalLLMStatus>;
        unload: () => Promise<{ success: boolean }>;
      };
    };
  }
}

export interface FederatedCitizen {
  cleanCpf: string;
  cpf: string;
  nomeCompleto: string;
  rg: string;
  orgaoEmissor: string;
  sexo: 'M' | 'F' | 'I';
  corRaca: string;
  dataNascimento: string; // ISO-8601 (YYYY-MM-DD)
  idade?: number;
  naturalidade?: {
    municipio: string;
    uf: string;
  };
  filiacao: {
    pai?: string;
    mae?: string;
  };
  genitores?: string[];
  estadoCivil: string;
  ultimoConjuge?: string;
  nomeConjuge?: string;
  dataCasamento?: string;
  numeroCertidaoCasamento?: string;
  numeroCertidaoNascimento?: string;
  statusSirc: 'ATIVO' | 'OBITO_JA_REGISTRADO' | 'CANCELADO';
  
  // Dados do Registro de Óbito Federado (Certidão de Óbito)
  tipoDocumento?: string;
  documentoSintetico?: boolean;
  matriculaObito?: string;
  cnsCartorio?: string;
  dataObito?: string;
  horaObito?: string;
  localObito?: string;
  municipioObito?: string;
  ufObito?: string;
  causaMorte?: string | null;
  medicoAtestante?: {
    nome: string;
    documento: string;
    crm?: string;
    uf?: string;
    tipoAteste?: string;
    dataAtestado?: string;
  };
  cemiterio?: string;
  localSepultamentoCremacao?: string | null;
  declaracoes?: {
    declarante?: string;
    existenciaBens?: boolean;
    existenciaFilhosAnotacao?: string;
    anotacoesAverbacoes?: string;
  };
  emissao?: {
    dataEmissao?: string;
    municipio?: string;
    uf?: string;
    oficial?: string;
    escrevente?: string;
    cargo?: string;
    enderecoCartorio?: string;
  };

  // Campos complementares da Declaração de Óbito Federada (ex: Clivia Nunes Rodrigues)
  viaDocumento?: string;
  tipoObito?: string;
  idadeDeclarada?: number;
  ocupacao?: string;
  cbo?: string | null;
  residencia?: {
    logradouro?: string;
    numero?: string;
    complemento?: string | null;
    cep?: string;
    bairro?: string;
    municipio?: string;
    codigoMunicipio?: string;
    uf?: string;
  };
  ocorrencia?: {
    tipoLocal?: string;
    estabelecimento?: string;
    cnes?: string | null;
    municipio?: string;
    codigoMunicipio?: string;
    uf?: string;
  };
  cartorio?: {
    nome?: string;
    municipio?: string;
    uf?: string;
    registroTermo?: string;
  };
  registroTermo?: string;
  rawJson?: any;
  updatedAt?: string;
}

export type FederatedSearchStatus = 
  | 'IDLE' 
  | 'BUSCANDO' 
  | 'VERIFICADO_ONLINE' 
  | 'NAO_ENCONTRADO' 
  | 'ERRO_REDE';

