import { FederatedBusStatus, CartorioCertificate, LocalFirstNodeStatus } from '../types';

export const INITIAL_FEDERATED_BUSES: FederatedBusStatus[] = [
  {
    id: 'CRC_NACIONAL',
    name: 'CRC Nacional - Central de Informações do Registro Civil',
    acronym: 'CRC-Nacional',
    legalBasis: 'Provimento CNJ nº 149/2023, Art. 215 / Lei 11.977/2009',
    endpoint: 'https://barramento.crcnacional.org.br/v2/obitos',
    status: 'CONNECTED',
    latencyMs: 38,
    lastSync: 'Em tempo real (Push/Pull)',
    tlsVersion: 'TLSv1.3 (mTLS)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
    verifiedFields: ['Assento Nascimento', 'Assento Casamento', 'Filiação Materna/Paterna', 'Estado Civil']
  },
  {
    id: 'ONR',
    name: 'ONR - Operador Nacional do Registro Eletrônico de Imóveis',
    acronym: 'ONR / SERP',
    legalBasis: 'Lei Federal nº 14.382/2022 (SERP) / Provimento CNJ 149/2023',
    endpoint: 'https://api.onr.org.br/v1/imoveis/indisponibilidade',
    status: 'CONNECTED',
    latencyMs: 45,
    lastSync: 'Última consulta há 2 min',
    tlsVersion: 'TLSv1.3 (mTLS)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
    verifiedFields: ['Deixou Bens Imóveis', 'Indisponibilidade de Bens', 'Matrículas Registrais']
  },
  {
    id: 'SIRC_SISOBI',
    name: 'SIRC / SISOBI - Sistema Integrado de Informações de Registro Civil',
    acronym: 'SIRC / INSS',
    legalBasis: 'Lei Federal nº 13.846/2019 / Decreto nº 9.929/2019',
    endpoint: 'https://sirc.dataprev.gov.br/ws/obito/v1',
    status: 'CONNECTED',
    latencyMs: 52,
    lastSync: 'Última consulta há 4 min',
    tlsVersion: 'TLSv1.3 (mTLS)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
    verifiedFields: ['Comunicação INSS (Art. 68 Lei 8.212)', 'Cessação Previdenciária', 'Benefício Ativo']
  },
  {
    id: 'RECEITA_FEDERAL',
    name: 'Receita Federal do Brasil - Barramento Cadastral CPF',
    acronym: 'RFB / CPF',
    legalBasis: 'Convênio CNJ / RFB - Instrução Normativa RFB nº 2.119/2022',
    endpoint: 'https://servicos.receita.fazenda.gov.br/mtls/cpf/consulta',
    status: 'CONNECTED',
    latencyMs: 31,
    lastSync: 'Síncrono (Validado)',
    tlsVersion: 'TLSv1.3 (mTLS)',
    cipherSuite: 'TLS_AES_256_GCM_SHA384',
    verifiedFields: ['Situação Cadastral CPF', 'Titularidade do CPF', 'Nome Materno Cadastral RFB']
  }
];

export const CARTORIO_CERTIFICATE: CartorioCertificate = {
  serventia: '1º Ofício de Registro Civil das Pessoas Naturais e Interdições',
  cns: '01.992-3',
  titular: 'Dr. Roberto Mendonça da Silva (Oficial Delegado)',
  subject: 'CN=1º OFICIO DE REGISTRO CIVIL:11849200000100, OU=Certificado PJ A1, O=ICP-Brasil, C=BR',
  issuer: 'AC NOTARIAL v5 / ICP-Brasil Autoridade Certificadora da Notariado',
  validUntil: '30/11/2027',
  serialNumber: '3F:8A:92:BC:11:45:DE:09:A4:77',
  type: 'A1 (PKCS#12)',
  ocspStatus: 'VÁLIDO / NÃO REVOGADO',
  lastHandshake: new Date().toLocaleTimeString('pt-BR')
};

export const INITIAL_LOCAL_FIRST_STATUS: LocalFirstNodeStatus = {
  runtime: 'Node.js Local-First Edge (Windows x64 Standalone Executável)',
  platform: 'Windows 10/11 Enterprise x64 (Cartório On-Premise)',
  localDb: 'SQLite 3 Encrypted (SQLCipher AES-256 no disco local C:\\CartorioData\\aria.db)',
  decisionEngine: 'OPA / Rego Determinístico Local (100% Offline na ponta)',
  auditLedger: 'SHA-256 Cryptographic Hash Chain (Imutabilidade Local Provimento CNJ)',
  contingencyMode: false,
  queuedSyncCount: 0
};
