import { EscreventeUser } from '../types';

export const MOCK_ESCREVENTES: EscreventeUser[] = [
  {
    id: 'user-01',
    nome: 'Guilherme Santos',
    cargo: 'ESCREVENTE_AUTORIZADO',
    cargoLabel: 'Escrevente Autorizado',
    matricula: 'ESC-8419',
    cpf: '042.881.939-12',
    email: 'guilherme.santos@cartorio1rcpn.jus.br',
    cartorio: '1º Ofício de Registro Civil das Pessoas Naturais',
    cns: '118492',
    comarca: 'Comarca da Capital - Florianópolis / SC',
    certificadoIcp: {
      tipo: 'A3 (Token USB Safenet)',
      serialNumber: '39F4.88B1.C092.77A4.F019',
      emissor: 'AC SERPRO Brasil v5 • ICP-Brasil',
      validade: '14/11/2026',
      status: 'VÁLIDO / ATIVO'
    },
    loginMethod: 'CERTIFICADO_DIGITAL',
    avatarInitials: 'GS'
  },
  {
    id: 'user-02',
    nome: 'Dra. Maria Helena Ribeiro',
    cargo: 'OFICIAL_TITULAR',
    cargoLabel: 'Oficial Registradora Titular',
    matricula: 'REG-1044',
    cpf: '189.442.109-08',
    email: 'maria.helena@cartorio1rcpn.jus.br',
    cartorio: '1º Ofício de Registro Civil das Pessoas Naturais',
    cns: '118492',
    comarca: 'Comarca da Capital - Florianópolis / SC',
    certificadoIcp: {
      tipo: 'A3 (SmartCard)',
      serialNumber: '55A1.77C2.E188.0932.11BC',
      emissor: 'AC Certisign G5 • ICP-Brasil',
      validade: '08/04/2027',
      status: 'VÁLIDO / ATIVO'
    },
    loginMethod: 'CERTIFICADO_DIGITAL',
    avatarInitials: 'MH'
  },
  {
    id: 'user-03',
    nome: 'Carlos Eduardo Menezes',
    cargo: 'ESCREVENTE_SUBSTITUTO',
    cargoLabel: 'Escrevente Substituto',
    matricula: 'ESC-7210',
    cpf: '552.193.409-77',
    email: 'carlos.menezes@cartorio1rcpn.jus.br',
    cartorio: '1º Ofício de Registro Civil das Pessoas Naturais',
    cns: '118492',
    comarca: 'Comarca da Capital - Florianópolis / SC',
    certificadoIcp: {
      tipo: 'Nuvem (NeoID/SafeID)',
      serialNumber: '91C2.3384.FA10.4491.7720',
      emissor: 'AC SyngularID Nuvem • ICP-Brasil',
      validade: '22/08/2026',
      status: 'VÁLIDO / ATIVO'
    },
    loginMethod: 'MATRICULA_SENHA',
    avatarInitials: 'CM'
  }
];

export const DEFAULT_ACTIVE_USER = MOCK_ESCREVENTES[0];
