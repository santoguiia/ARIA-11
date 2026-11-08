/**
 * Serviço de Integração com a Base Federada Centralizada (Google Cloud Firestore)
 * Consulta em tempo real por CPF aos registros civis (CRC Nacional / RFB / SIRC)
 */

import { doc, getDoc, setDoc, collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { FederatedCitizen, DeathRecordData } from '../types';
import { validateCPF } from '../engine/validators';

export const FEDERATED_COLLECTION = 'federated_citizens';

/**
 * Catálogo Canônico Inicial de Cidadãos para Testes e Homologação
 */
export const SEED_FEDERATED_CITIZENS: FederatedCitizen[] = [
  {
    cleanCpf: '41069022306',
    cpf: '410.690.223-06',
    nomeCompleto: 'CLIVIA NUNES RODRIGUES',
    rg: '2005-CE-88419',
    orgaoEmissor: 'SSP/CE',
    sexo: 'F',
    corRaca: 'PARDA',
    dataNascimento: '1995-06-28',
    idade: 60,
    idadeDeclarada: 60,
    ocupacao: 'Motorista',
    cbo: null,
    naturalidade: {
      municipio: 'Fortaleza',
      uf: 'CE'
    },
    filiacao: {
      mae: 'Beatriz Fernandes Nunes',
      pai: 'Joao Machado Rodrigues'
    },
    genitores: [
      'Beatriz Fernandes Nunes',
      'Joao Machado Rodrigues'
    ],
    estadoCivil: 'SOLTEIRA',
    statusSirc: 'OBITO_JA_REGISTRADO',
    tipoDocumento: 'Declaracao de Obito',
    viaDocumento: '1a VIA - SECRETARIA DE SAUDE',
    documentoSintetico: true,
    tipoObito: 'NAO_FETAL',
    matriculaObito: '10735111022006',
    registroTermo: '10735111022006',
    cnsCartorio: '107351',
    dataObito: '2005-12-18',
    horaObito: '07:20',
    localObito: 'Hospital Municipal',
    municipioObito: 'Fortaleza',
    ufObito: 'CE',
    causaMorte: 'Atestada em prontuário hospitalar (sem necropsia)',
    medicoAtestante: {
      nome: 'Camila Teixeira Freitas',
      documento: '673372',
      crm: '673372',
      uf: 'CE',
      tipoAteste: 'Assistente',
      dataAtestado: '2005-12-18'
    },
    cemiterio: 'Cemitério Municipal de Fortaleza',
    localSepultamentoCremacao: 'Cemitério Municipal de Fortaleza',
    residencia: {
      logradouro: 'Rua XV de Novembro',
      numero: '705',
      complemento: null,
      cep: '80010-010',
      bairro: 'Centro',
      municipio: 'Curitiba',
      codigoMunicipio: '4106902',
      uf: 'PR'
    },
    ocorrencia: {
      tipoLocal: 'Hospital',
      estabelecimento: 'Hospital Municipal',
      cnes: null,
      municipio: 'Fortaleza',
      codigoMunicipio: '2304400',
      uf: 'CE'
    },
    cartorio: {
      nome: 'Registro Civil das Pessoas Naturais da Sede',
      municipio: 'Fortaleza',
      uf: 'CE',
      registroTermo: '10735111022006'
    },
    declaracoes: {
      declarante: 'Declarante Qualificado Conforme D.O.',
      existenciaBens: false,
      existenciaFilhosAnotacao: 'Sem filhos declarados',
      anotacoesAverbacoes: 'Registro Civil das Pessoas Naturais da Sede - Fortaleza/CE'
    },
    emissao: {
      dataEmissao: '2005-12-18',
      municipio: 'Fortaleza',
      uf: 'CE',
      oficial: 'Oficial Titular do RCPN da Sede',
      escrevente: 'Escrevente Autorizada',
      cargo: 'OFICIAL SUBSTITUTO',
      enderecoCartorio: 'Registro Civil das Pessoas Naturais da Sede • Fortaleza - CE • Termo 10735111022006'
    },
    rawJson: {
      documento: {
        tipo: 'Declaracao de Obito',
        via: '1a VIA - SECRETARIA DE SAUDE',
        sintetico: true
      },
      identificacao: {
        tipo_obito: 'NAO_FETAL',
        data_obito: '2005-12-18',
        hora_obito: '07:20',
        naturalidade: {
          municipio: 'Fortaleza',
          uf: 'CE'
        },
        nome_falecido: 'Clivia Nunes Rodrigues',
        nome_pai: 'Joao Machado Rodrigues',
        nome_mae: 'Beatriz Fernandes Nunes',
        data_nascimento: '1995-06-28',
        idade_declarada: 60,
        sexo: 'F',
        ocupacao: 'Motorista',
        cbo: null
      },
      residencia: {
        logradouro: 'Rua XV de Novembro',
        numero: '705',
        complemento: null,
        cep: '80010-010',
        bairro: 'Centro',
        municipio: 'Curitiba',
        codigo_municipio: '4106902',
        uf: 'PR'
      },
      ocorrencia: {
        tipo_local: 'Hospital',
        estabelecimento: 'Hospital Municipal',
        cnes: null,
        municipio: 'Fortaleza',
        codigo_municipio: '2304400',
        uf: 'CE'
      },
      causas_morte: {
        parte_1: [],
        parte_2: []
      },
      medico: {
        nome: 'Camila Teixeira Freitas',
        crm: '673372',
        uf: 'CE',
        tipo_ateste: 'Assistente',
        data_atestado: '2005-12-18'
      },
      cartorio: {
        nome: 'Registro Civil das Pessoas Naturais da Sede',
        municipio: 'Fortaleza',
        uf: 'CE',
        registro_termo: '10735111022006'
      }
    },
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '88828064647',
    cpf: '888-280-646-47',
    nomeCompleto: 'LEONARDO OLIVEIRA',
    rg: '14.970.287-DF',
    orgaoEmissor: 'SSP/DF',
    sexo: 'M',
    corRaca: 'BRANCA',
    dataNascimento: '1906-01-15',
    idade: 88,
    naturalidade: {
      municipio: 'Recife',
      uf: 'PE'
    },
    filiacao: {
      mae: 'Heloisa Nascimento Oliveira',
      pai: 'Fabio Ferreira Oliveira'
    },
    genitores: [
      'Heloisa Nascimento Oliveira',
      'Fabio Ferreira Oliveira'
    ],
    estadoCivil: 'VIUVO',
    ultimoConjuge: 'Daniela Ribeiro Rodrigues',
    nomeConjuge: 'Daniela Ribeiro Rodrigues',
    statusSirc: 'OBITO_JA_REGISTRADO',
    tipoDocumento: 'Certidao de Obito',
    documentoSintetico: true,
    matriculaObito: '31-1497-01-55-1994-4-00287-023-0030877-71',
    cnsCartorio: '654232',
    dataObito: '1994-05-29',
    horaObito: '15:51',
    localObito: 'Hospital Municipal',
    municipioObito: 'Brasilia',
    ufObito: 'DF',
    causaMorte: null,
    medicoAtestante: {
      nome: 'Isabela Ferreira Rodrigues',
      documento: '722289',
      crm: '722289',
      uf: 'DF'
    },
    localSepultamentoCremacao: null,
    declaracoes: {
      declarante: 'Heitor Gomes Ramos',
      existenciaBens: false,
      existenciaFilhosAnotacao: 'Carlos Canalle 39 anos',
      anotacoesAverbacoes: 'Hospital Municipal'
    },
    emissao: {
      dataEmissao: '1995-06-07',
      municipio: 'Brasilia',
      uf: 'DF',
      oficial: 'Antonio Costa Nunes',
      escrevente: 'Clara Pereira Ribeiro',
      cargo: 'OFICIAL SUBSTITUTO',
      enderecoCartorio: 'SBS Quadra 2, no 101 Asa Sul CEP 70070-902 Brasilia - DF'
    },
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '09623650922',
    cpf: '096.236.509.22',
    nomeCompleto: 'JÚLIA FREITAS CAMPOS',
    rg: '42.891.004-9',
    orgaoEmissor: 'SSP/SP',
    sexo: 'F',
    corRaca: 'BRANCA',
    dataNascimento: '1948-03-12',
    filiacao: {
      mae: 'MARIA FREITAS CAMPOS',
      pai: 'ANTONIO CARLOS CAMPOS'
    },
    estadoCivil: 'VIUVA',
    nomeConjuge: 'MANOEL CAMPOS',
    numeroCertidaoCasamento: '118492 01 55 1970 2 00142 098 0001849-12',
    numeroCertidaoNascimento: '118492 01 55 1948 1 00012 045 0000892-04',
    statusSirc: 'ATIVO',
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '58291473005',
    cpf: '582.914.730-05',
    nomeCompleto: 'CARLOS EDUARDO DA SILVA',
    rg: '12.345.678-9',
    orgaoEmissor: 'SSP/SC',
    sexo: 'M',
    corRaca: 'BRANCA',
    dataNascimento: '1954-08-15',
    filiacao: {
      mae: 'MARIA SILVA',
      pai: 'JOSE SILVA'
    },
    estadoCivil: 'CASADO',
    nomeConjuge: 'ANA PAULA SILVA',
    numeroCertidaoCasamento: '118492 01 55 1980 2 00084 102 0001204-55',
    statusSirc: 'ATIVO',
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '24988231828',
    cpf: '249.882.318-28',
    nomeCompleto: 'ROBERTO ALMEIDA PRADO',
    rg: '34.567.890-1',
    orgaoEmissor: 'SSP/SP',
    sexo: 'M',
    corRaca: 'PARDA',
    dataNascimento: '1962-11-03',
    filiacao: {
      mae: 'HELENA ALMEIDA PRADO',
      pai: 'FERNANDO PRADO'
    },
    estadoCivil: 'CASADO',
    nomeConjuge: 'MARIA CLARA PRADO',
    statusSirc: 'ATIVO',
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '71428591052',
    cpf: '714.285.910-52',
    nomeCompleto: 'FERNANDO HENRIQUE DIAS',
    rg: '56.789.012-3',
    orgaoEmissor: 'SSP/RJ',
    sexo: 'M',
    corRaca: 'BRANCA',
    dataNascimento: '2008-05-20',
    filiacao: {
      mae: 'PATRICIA DIAS',
      pai: 'RODRIGO DIAS'
    },
    estadoCivil: 'SOLTEIRO',
    statusSirc: 'ATIVO',
    updatedAt: new Date().toISOString()
  },
  {
    cleanCpf: '38192047115',
    cpf: '381.920.471-15',
    nomeCompleto: 'ANTONIO FAGUNDES MOREIRA',
    rg: '23.456.789-0',
    orgaoEmissor: 'SSP/PR',
    sexo: 'M',
    corRaca: 'BRANCA',
    dataNascimento: '1970-02-18',
    filiacao: {
      mae: 'LUCIA FAGUNDES',
      pai: 'MARCOS MOREIRA'
    },
    estadoCivil: 'DIVORCIADO',
    statusSirc: 'ATIVO',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Consulta um registro de cidadão na Base Federada do Firestore pelo CPF ou Termo Registral
 * @param rawCpf CPF formatado, sem máscara, número de termo ou nome
 */
export async function getFederatedRecordByCpf(rawCpf: string): Promise<FederatedCitizen | null> {
  if (!rawCpf) return null;
  const clean = rawCpf.replace(/\D/g, '');
  const trimmed = rawCpf.trim().toUpperCase();

  try {
    // 1. Busca por Doc ID direto no Firestore se houver dígitos normalizados
    if (clean) {
      const docRef = doc(db, FEDERATED_COLLECTION, clean);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as FederatedCitizen;
      }
    }

    // 2. Busca por query se clean for um CPF de 11 dígitos
    if (clean.length === 11) {
      const q = query(collection(db, FEDERATED_COLLECTION), where('cleanCpf', '==', clean), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as FederatedCitizen;
      }
    }

    // 3. Fallback nos registros canônicos da base federada
    const localMatch = SEED_FEDERATED_CITIZENS.find(c => 
      (clean && c.cleanCpf === clean) ||
      (clean && c.registroTermo && c.registroTermo.replace(/\D/g, '') === clean) ||
      (clean && c.matriculaObito && c.matriculaObito.replace(/\D/g, '') === clean) ||
      (trimmed.length > 3 && c.nomeCompleto.toUpperCase().includes(trimmed))
    );

    if (localMatch) {
      console.info(`[Base Federada] Registro '${localMatch.nomeCompleto}' recuperado via contingência canônica.`);
      return localMatch;
    }

    return null;
  } catch (err: any) {
    console.warn(`[Base Federada] Erro ao consultar '${rawCpf}' no Firestore:`, err);
    
    // Fallback de contingência offline transparente
    const offlineCitizen = SEED_FEDERATED_CITIZENS.find(c => 
      (clean && c.cleanCpf === clean) ||
      (clean && c.registroTermo && c.registroTermo.replace(/\D/g, '') === clean) ||
      (clean && c.matriculaObito && c.matriculaObito.replace(/\D/g, '') === clean) ||
      (trimmed.length > 3 && c.nomeCompleto.toUpperCase().includes(trimmed))
    );
    if (offlineCitizen) {
      return offlineCitizen;
    }

    throw err;
  }
}

/**
 * Mapeia o registro da Base Federada (CRC/RFB) para a estrutura DeathRecordData (Fonte C)
 */
export function mapCitizenToDeathRecordData(
  citizen: FederatedCitizen,
  currentFederada?: DeathRecordData
): DeathRecordData {
  const base = currentFederada || {
    numeroDO: '',
    nomeFalecido: '',
    cpf: '',
    rg: '',
    rgOrgaoEmissor: '',
    dataNascimento: '',
    sexo: 'M',
    corRaca: 'BRANCA',
    estadoCivil: 'SOLTEIRO',
    dataCasamento: '',
    nomeConjuge: '',
    nomeMae: '',
    nomePai: '',
    dataObito: '',
    horaObito: '',
    localObito: '',
    tipoLocal: 'HOSPITAL',
    municipioObito: '',
    ufObito: '',
    causaMortis: '',
    cid10: '',
    nomeMedico: '',
    crmMedico: '',
    ufCrm: '',
    sepultamentoCremacao: 'SEPULTAMENTO',
    cemiterio: '',
    deixouBens: 'NAO',
    deixouTestamento: 'NAO',
    deixouFilhos: 'NAO',
    qtdFilhos: 0,
    nomesFilhos: '',
    nomeDeclarante: '',
    qualificacaoDeclarante: ''
  };

  const filiacaoMae = citizen.filiacao?.mae || (citizen.genitores && citizen.genitores[0]) || '';
  const filiacaoPai = citizen.filiacao?.pai || (citizen.genitores && citizen.genitores[1]) || '';
  const spouse = citizen.ultimoConjuge || citizen.nomeConjuge || '';

  return {
    ...base,
    cpf: citizen.cpf,
    nomeFalecido: citizen.nomeCompleto.toUpperCase(),
    rg: citizen.rg || base.rg,
    rgOrgaoEmissor: citizen.orgaoEmissor || base.rgOrgaoEmissor,
    sexo: (citizen.sexo === 'M' || citizen.sexo === 'MASCULINO' as any) ? 'M' : (citizen.sexo === 'F' || citizen.sexo === 'FEMININO' as any) ? 'F' : (citizen.sexo as any || 'M'),
    corRaca: (citizen.corRaca || 'BRANCA').toUpperCase() as any,
    dataNascimento: citizen.dataNascimento || base.dataNascimento,
    nomeMae: (filiacaoMae || base.nomeMae).toUpperCase(),
    nomePai: (filiacaoPai || base.nomePai).toUpperCase(),
    estadoCivil: (citizen.estadoCivil ? citizen.estadoCivil.replace(/\(A\)/i, '') : 'SOLTEIRO').toUpperCase() as any,
    nomeConjuge: (spouse || base.nomeConjuge).toUpperCase(),
    dataCasamento: citizen.dataCasamento || base.dataCasamento || '',
    
    // Dados de óbito se presentes na base federada
    numeroDO: citizen.registroTermo || citizen.matriculaObito || base.numeroDO,
    dataObito: citizen.dataObito || base.dataObito,
    horaObito: citizen.horaObito || base.horaObito,
    localObito: citizen.ocorrencia?.estabelecimento || citizen.localObito || base.localObito,
    municipioObito: citizen.ocorrencia?.municipio || citizen.municipioObito || base.municipioObito,
    ufObito: citizen.ocorrencia?.uf || citizen.ufObito || base.ufObito,
    causaMortis: citizen.causaMorte || base.causaMortis,
    nomeMedico: citizen.medicoAtestante?.nome || base.nomeMedico,
    crmMedico: citizen.medicoAtestante?.documento || citizen.medicoAtestante?.crm || base.crmMedico,
    ufCrm: citizen.medicoAtestante?.uf || base.ufCrm,
    sepultamentoCremacao: (() => {
      const raw = (citizen.localSepultamentoCremacao || citizen.cemiterio || '').trim().toUpperCase();
      if (raw.includes('CREMAT') || raw.includes('CREMAÇÃO') || raw === 'CREMACAO') return 'CREMACAO';
      return 'SEPULTAMENTO';
    })(),
    cemiterio: (() => {
      if (citizen.cemiterio && citizen.cemiterio.trim()) return citizen.cemiterio.trim();
      const raw = (citizen.localSepultamentoCremacao || '').trim();
      const upper = raw.toUpperCase();
      if (upper === 'SEPULTAMENTO' || upper === 'CREMACAO' || upper === 'CREMAÇÃO') {
        return base.cemiterio || '';
      }
      return raw || base.cemiterio || '';
    })(),
    deixouBens: citizen.declaracoes?.existenciaBens !== undefined ? (citizen.declaracoes.existenciaBens ? 'SIM' : 'NAO') : base.deixouBens,
    nomesFilhos: citizen.declaracoes?.existenciaFilhosAnotacao || base.nomesFilhos,
    deixouFilhos: citizen.declaracoes?.existenciaFilhosAnotacao ? 'SIM' : base.deixouFilhos,
    nomeDeclarante: citizen.declaracoes?.declarante ? citizen.declaracoes.declarante.toUpperCase() : base.nomeDeclarante,

    // Metadados da Certidão Oficial e Cartório Emissor da Base Federada
    matricula: citizen.matriculaObito || base.matricula,
    cnsCartorio: citizen.cnsCartorio || base.cnsCartorio,
    cartorioNome: citizen.cartorio?.nome || base.cartorioNome,
    cartorioEndereco: citizen.cartorio ? `${citizen.cartorio.nome} • ${citizen.cartorio.municipio} - ${citizen.cartorio.uf} • Termo ${citizen.cartorio.registroTermo}` : (citizen.emissao?.enderecoCartorio || base.cartorioEndereco),
    oficialRegistro: citizen.emissao?.oficial || base.oficialRegistro,
    escreventeRegistro: citizen.emissao?.escrevente || base.escreventeRegistro,
    cargoOficial: citizen.emissao?.cargo || base.cargoOficial,
    dataEmissaoCertidao: citizen.emissao?.dataEmissao || base.dataEmissaoCertidao,
    municipioEmissao: citizen.emissao?.municipio || base.municipioEmissao,
    ufEmissao: citizen.emissao?.uf || base.ufEmissao,
    anotacoesAverbacoes: citizen.declaracoes?.anotacoesAverbacoes || base.anotacoesAverbacoes,
    idadeFalecido: citizen.idadeDeclarada !== undefined ? citizen.idadeDeclarada : (citizen.idade !== undefined ? citizen.idade : base.idadeFalecido),
    naturalidadeMunicipio: citizen.naturalidade?.municipio || base.naturalidadeMunicipio,
    naturalidadeUf: citizen.naturalidade?.uf || base.naturalidadeUf,
    ocupacao: citizen.ocupacao || base.ocupacao,
    registroTermo: citizen.registroTermo || base.registroTermo,
    enderecoResidencia: citizen.residencia ? `${citizen.residencia.logradouro}, ${citizen.residencia.numero} - ${citizen.residencia.bairro}, ${citizen.residencia.municipio}/${citizen.residencia.uf} (CEP ${citizen.residencia.cep})` : base.enderecoResidencia,
    tipoObito: citizen.tipoObito || base.tipoObito
  };
}

/**
 * Executa o seed dos dados canônicos no Google Cloud Firestore
 */
export async function seedFederatedDataToFirestore(): Promise<{ count: number; message: string }> {
  let count = 0;
  for (const citizen of SEED_FEDERATED_CITIZENS) {
    try {
      const docRef = doc(db, FEDERATED_COLLECTION, citizen.cleanCpf);
      await setDoc(docRef, {
        ...citizen,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;

      // Se possuir registroTermo numérico diferente do cleanCpf, indexa também pelo termo
      if (citizen.registroTermo) {
        const cleanTermo = citizen.registroTermo.replace(/\D/g, '');
        if (cleanTermo && cleanTermo !== citizen.cleanCpf) {
          const termoDocRef = doc(db, FEDERATED_COLLECTION, cleanTermo);
          await setDoc(termoDocRef, {
            ...citizen,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (err: any) {
      console.warn(`Erro ao persistir seed do CPF ${citizen.cleanCpf}:`, err);
    }
  }

  return {
    count,
    message: `${count} registros de cidadãos foram sincronizados com sucesso na coleção '${FEDERATED_COLLECTION}' do Firestore.`
  };
}

/**
 * Verifica se a coleção federated_citizens necessita de carga inicial automática
 */
export async function checkIfFederatedCollectionNeedsSeed(): Promise<boolean> {
  try {
    const q = query(collection(db, FEDERATED_COLLECTION), limit(1));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (err) {
    console.warn('[Base Federada] Verificação de seed retornou aviso:', err);
    return false;
  }
}
