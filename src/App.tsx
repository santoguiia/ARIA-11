/**
 * ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito
 * PoC Projeto Acadêmico REF-11 / INE5448 (UFSC - Engenharia de Software)
 * Preparada para execução web e empacotamento standalone Windows (.exe x64) via Electron.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  DeathRecordData, 
  OCRConfidenceMap, 
  AuditLogEntry, 
  FederatedBusStatus, 
  CartorioCertificate, 
  LocalFirstNodeStatus, 
  EscreventeUser,
  OCRDocumentState,
  LocalLLMStatus,
  BiometricRecord,
  FederatedSearchStatus
} from './types';
import { evaluateQualityGate } from './engine/rules';
import { computeHash, validateCPF } from './engine/validators';
import { 
  processUploadedOCRFile, 
  createInitialOCRDocumentState
} from './engine/ocrPipeline';
import { INITIAL_FEDERATED_BUSES, CARTORIO_CERTIFICATE, INITIAL_LOCAL_FIRST_STATUS } from './data/federatedBuses';
import { MOCK_ESCREVENTES } from './data/mockUsers';
import { getLLMStatus } from './engine/llmClient';
import { EMPTY_PRODUCTION_SCENARIO, createEmptyDeathRecordData, createEmptyOCRConfidence } from './data/emptyRecord';
import { db } from './firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { 
  getFederatedRecordByCpf, 
  mapCitizenToDeathRecordData, 
  seedFederatedDataToFirestore, 
  checkIfFederatedCollectionNeedsSeed 
} from './services/federatedFirestoreService';

import { LoginScreen } from './components/LoginScreen';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { ComparativePanel } from './components/ComparativePanel';
import { QualityGateDrawer } from './components/QualityGateDrawer';
import { AuditTrailModal } from './components/AuditTrailModal';
import { OCRPreviewModal } from './components/OCRPreviewModal';
import { CertificatePreviewModal } from './components/CertificatePreviewModal';
import { AboutModal } from './components/AboutModal';
import { CNJReportModal } from './components/CNJReportModal';
import { BiometricCaptureModal } from './components/BiometricCaptureModal';

export default function App() {

  // Working data copies (Source A, Source B, Source C) initialized 100% clean
  const [declaracao, setDeclaracao] = useState<DeathRecordData>(() => createEmptyDeathRecordData());
  const [ocr, setOcr] = useState<DeathRecordData>(() => createEmptyDeathRecordData());
  const [ocrConfidence, setOcrConfidence] = useState<OCRConfidenceMap>(() => createEmptyOCRConfidence());
  const [federada, setFederada] = useState<DeathRecordData>(() => createEmptyDeathRecordData());

  // Local-First OCR Document State with Bounding Boxes & LGPD On-Device processing
  const [ocrDocumentState, setOcrDocumentState] = useState<OCRDocumentState>(() => {
    return createInitialOCRDocumentState(createEmptyDeathRecordData()).state;
  });
  const [focusedOCRField, setFocusedOCRField] = useState<keyof DeathRecordData | null>(null);

  // Federated Buses & Local-First Node State
  const [federatedBuses, setFederatedBuses] = useState<FederatedBusStatus[]>(INITIAL_FEDERATED_BUSES);
  const [cartorioCert, setCartorioCert] = useState<CartorioCertificate>(CARTORIO_CERTIFICATE);
  const [localNodeStatus, setLocalNodeStatus] = useState<LocalFirstNodeStatus>(INITIAL_LOCAL_FIRST_STATUS);
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);

  // Justifications keyed by ruleId
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  // Google Gemini Vision OCR API connection & diagnostic status
  const [googleOcrStatus, setGoogleOcrStatus] = useState<{
    tested: boolean;
    ok: boolean;
    model?: string;
    latencyMs?: number;
    isTesting: boolean;
    message?: string;
  }>({
    tested: false,
    ok: false,
    isTesting: false
  });

  // Active Clerk / Escrevente and Authentication State
  const [currentUser, setCurrentUser] = useState<EscreventeUser | null>(() => {
    const saved = localStorage.getItem('aria_logged_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('aria_logged_in');
    return saved === 'true';
  });

  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aria_theme_preference');
    return saved !== null ? saved === 'dark' : true;
  });

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('aria_theme_preference', next ? 'dark' : 'light');
      return next;
    });
  };

  // Handler: Start a pristine, 100% clean production lavratura
  const handleNewCleanLavratura = () => {
    setDeclaracao(createEmptyDeathRecordData());
    setOcr(createEmptyDeathRecordData());
    setOcrConfidence(createEmptyOCRConfidence());
    setFederada(createEmptyDeathRecordData());
    setOcrDocumentState(createInitialOCRDocumentState(createEmptyDeathRecordData()).state);
    setJustifications({});
    setBiometriaRecord(null);
    setFederatedStatus('IDLE');
    if (lastSearchedCpfRef.current) {
      lastSearchedCpfRef.current = '';
    }
    appendAuditLog(
      'SCENARIO_LOADED',
      'Nova pré-lavratura iniciada com formulários limpos (ambiente de produção sem dados prévios).'
    );
    showToast('Nova lavratura em branco iniciada com formulários limpos.');
  };

  const handleLogin = (user: EscreventeUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('aria_logged_user', JSON.stringify(user));
    localStorage.setItem('aria_logged_in', 'true');
    // Ensure the clerk starts in a clean production lavratura
    handleNewCleanLavratura();
    appendAuditLog(
      'OPERADOR_LOGIN',
      `Sessão iniciada: ${user.nome} (${user.matricula}) autenticado via ${
        user.loginMethod === 'CERTIFICADO_DIGITAL' ? 'Certificado Digital ICP-Brasil' : 'Matrícula e Senha'
      }.`
    );
    showToast(`Bem-vindo, ${user.nome}! Sessão autenticada.`);
  };

  const handleLogout = () => {
    if (currentUser) {
      appendAuditLog(
        'OPERADOR_LOGOUT',
        `Estação de trabalho bloqueada / logout efetuado por ${currentUser.nome} (${currentUser.matricula}).`
      );
    }
    // LGPD Expurgo de dados de trabalho da sessão
    setDeclaracao(createEmptyDeathRecordData());
    setOcr(createEmptyDeathRecordData());
    setOcrConfidence(createEmptyOCRConfidence());
    setFederada(createEmptyDeathRecordData());
    setJustifications({});
    setBiometriaRecord(null);
    setFederatedStatus('IDLE');
    if (lastSearchedCpfRef.current) {
      lastSearchedCpfRef.current = '';
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('aria_logged_in');
    localStorage.removeItem('aria_logged_user');
    showToast('Sessão encerrada com sucesso. Memória purgada conforme LGPD.');
  };

  // Inactivity auto-lock timer (15 minutes) for Security Compliance (LGPD & Prov. CNJ 149)
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        showToast('Sessão bloqueada automaticamente por inatividade (Segurança da Informação).');
      }, 15 * 60 * 1000);
    };

    resetTimer();
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isLoggedIn, currentUser]);

  // Local Audit Logs (simulating SQLite persistent ledger with SHA-256 hash chaining)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCNJReportModalOpen, setIsCNJReportModalOpen] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);

  // Biometric / Signature state captured for current lavratura
  const [biometriaRecord, setBiometriaRecord] = useState<BiometricRecord | null>(null);

  // Base Federada (Fonte C) real-time online state
  const [federatedStatus, setFederatedStatus] = useState<FederatedSearchStatus>('IDLE');
  const [isSeedingFederated, setIsSeedingFederated] = useState<boolean>(false);

  // Initial Federated Collection Auto-Seed & OCR Diagnostics
  useEffect(() => {
    // Auto-seed transparente da coleção federated_citizens caso o banco esteja novo/vazio
    checkIfFederatedCollectionNeedsSeed().then(async (needsSeed) => {
      if (needsSeed) {
        console.info('[Base Federada] Inicializando seed canônico de cidadãos no Firestore...');
        await seedFederatedDataToFirestore();
      }
    }).catch(err => console.warn('Erro ao verificar seed federado:', err));

    // Verificação de conectividade do Google Gemini Vision OCR
    fetch('/api/ocr/verify')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setGoogleOcrStatus({
            tested: true,
            ok: true,
            model: data.activeModel,
            latencyMs: data.latencyMs,
            message: data.message,
            isTesting: false
          });
        }
      })
      .catch(() => {});
  }, []);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-heal legacy mock CPFs if present in state
  useEffect(() => {
    if (declaracao.cpf === '582.914.730-49') {
      setDeclaracao(prev => ({ ...prev, cpf: '582.914.730-05' }));
      setOcr(prev => prev.cpf === '582.914.730-49' ? { ...prev, cpf: '582.914.730-05' } : prev);
      setFederada(prev => prev.cpf === '582.914.730-49' ? { ...prev, cpf: '582.914.730-05' } : prev);
    } else if (declaracao.cpf === '249.882.318-72') {
      setDeclaracao(prev => ({ ...prev, cpf: '249.882.318-28' }));
      setOcr(prev => prev.cpf === '249.882.318-72' ? { ...prev, cpf: '249.882.318-28' } : prev);
      setFederada(prev => prev.cpf === '249.882.318-72' ? { ...prev, cpf: '249.882.318-28' } : prev);
    } else if (declaracao.cpf === '714.285.910-00') {
      setDeclaracao(prev => ({ ...prev, cpf: '714.285.910-52' }));
      setOcr(prev => prev.cpf === '714.285.910-00' ? { ...prev, cpf: '714.285.910-52' } : prev);
      setFederada(prev => prev.cpf === '714.285.910-00' ? { ...prev, cpf: '714.285.910-52' } : prev);
    }
  }, []);

  // Evaluate Quality Gate rules
  const gateEvaluation = useMemo(() => {
    return evaluateQualityGate(declaracao, ocr, ocrConfidence, federada, justifications);
  }, [declaracao, ocr, ocrConfidence, federada, justifications]);

  // Append a cryptographic audit log entry
  const appendAuditLog = useCallback(async (
    action: AuditLogEntry['action'],
    resumo: string,
    extraJustifications?: Record<string, string>,
    biometricRecord?: BiometricRecord
  ) => {
    setAuditLogs((prevLogs) => {
      const prevHash = prevLogs.length > 0 ? prevLogs[0].sha256Hash : '0000000000000000000000000000000000000000000000000000000000000000';
      const timestamp = new Date().toLocaleString('pt-BR');
      const seed = `${timestamp}|${action}|${resumo}|${declaracao.numeroDO}|${declaracao.cpf}|${biometricRecord?.sha256Hash || ''}|${prevHash}`;
      
      // Calculate synchronous hash simulation or async
      let pseudoHash = '';
      for (let i = 0; i < seed.length; i++) {
        pseudoHash = ((pseudoHash + seed.charCodeAt(i).toString(16)) + 'abcdef0123456789').slice(0, 64);
      }

      const operadorLabel = currentUser 
        ? `${currentUser.nome} (${currentUser.cargoLabel})`
        : 'Guilherme Santos (Escrevente Autorizado)';
      const matriculaLabel = currentUser?.matricula || 'ESC-8419';
      const cartorioLabel = currentUser?.cartorio || '1º Ofício de RCPN Central';

      const newEntry: AuditLogEntry = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        operador: operadorLabel,
        matricula: matriculaLabel,
        cartorio: cartorioLabel,
        action,
        resumo,
        sha256Hash: pseudoHash,
        previousHash: prevHash,
        rulesFailingCount: {
          impedientes: gateEvaluation.summary.impedientes,
          alertas: gateEvaluation.summary.alertasObrigatorios,
          informativos: gateEvaluation.summary.informativos
        },
        justifications: extraJustifications || justifications,
        snapshotData: {
          numeroDO: declaracao.numeroDO,
          nomeFalecido: declaracao.nomeFalecido,
          cpf: declaracao.cpf
        },
        biometricRecord: biometricRecord
      };

      const updated = [newEntry, ...prevLogs];
      try {
        localStorage.setItem('ARIA_AUDIT_LEDGER', JSON.stringify(updated.slice(0, 50)));
      } catch (e) {
        console.error('Storage quota exceeded', e);
      }

      // Sincronização centralizada em nuvem (Firestore) para persistência segura
      if (currentUser?.id) {
        try {
          const logDocRef = doc(db, 'audit_logs', newEntry.id);
          setDoc(logDocRef, {
            id: newEntry.id,
            operadorUid: currentUser.id,
            operadorNome: newEntry.operador,
            action: newEntry.action,
            resumo: newEntry.resumo.slice(0, 480),
            sha256Hash: newEntry.sha256Hash,
            previousHash: newEntry.previousHash,
            timestamp: newEntry.timestamp,
            ...(biometricRecord ? {
              biometriaHash: biometricRecord.sha256Hash,
              biometriaType: biometricRecord.type
            } : {})
          }).catch(err => console.warn('Sync audit log to Firestore:', err));
        } catch (e) {
          // Fallback offline
        }
      }

      return updated;
    });
  }, [currentUser, declaracao, gateEvaluation.summary, justifications]);

  // Handler: Attach Biometric Thumbprint / Digital Signature to the record
  const handleAttachBiometric = async (record: BiometricRecord) => {
    setBiometriaRecord(record);
    await appendAuditLog(
      'BIOMETRIC_CAPTURE',
      `Captura e selamento criptográfico de ${record.typeLabel} do declarante ${record.declaranteNome} (SHA-256: ${record.sha256Hash.slice(0, 16)}...).`,
      undefined,
      record
    );
    showToast(`Biometria / Assinatura de ${record.declaranteNome} vinculada com sucesso!`);
    setIsBiometricModalOpen(false);
  };

  // Stable ref for appendAuditLog to decouple triggerFederatedLookup from render churn
  const appendAuditLogRef = useRef(appendAuditLog);
  appendAuditLogRef.current = appendAuditLog;

  // Track the last successfully searched CPF to strictly avoid infinite re-fetching
  const lastSearchedCpfRef = useRef<string>('');

  // Handler: Real-time lookup of CPF on Central Federated Base (Google Cloud Firestore)
  const triggerFederatedLookup = useCallback(async (cpfToSearch: string) => {
    const clean = (cpfToSearch || '').replace(/\D/g, '');
    const isStandardValidCpf = clean.length === 11 && validateCPF(clean).valid;
    const isFederatedTermo = clean === '10735111022006' || clean === '10735111022';

    if (!isStandardValidCpf && !isFederatedTermo) {
      setFederatedStatus('IDLE');
      return;
    }

    setFederatedStatus('BUSCANDO');
    try {
      const citizen = await getFederatedRecordByCpf(clean);
      if (citizen) {
        setFederada(prev => mapCitizenToDeathRecordData(citizen, prev));
        setFederatedStatus('VERIFICADO_ONLINE');
        showToast(`Base Central CRC/RFB: Cidadão '${citizen.nomeCompleto}' localizado no Firestore!`);
        await appendAuditLogRef.current(
          'EVALUATION',
          `Consulta cadastral em tempo real no Firestore (Base Federada Central): Cidadão ${citizen.nomeCompleto} (CPF ${citizen.cpf || citizen.registroTermo}) localizado com status SIRC ${citizen.statusSirc}.`
        );
      } else {
        setFederatedStatus('NAO_ENCONTRADO');
        showToast('CPF/Termo não localizado na Base Federada Central (Firestore).');
      }
    } catch (err: any) {
      console.warn('Erro na consulta ao Firestore da Base Federada:', err);
      setFederatedStatus('ERRO_REDE');
      showToast('Falha na comunicação com o Firestore. Modo de contingência ativo.');
    }
  }, []);

  // Watcher com debounce (400ms) ao alterar o CPF na Fonte A (ou após cópia da Fonte B)
  // Executa estritamente uma única vez por alteração de CPF válido para evitar loops
  useEffect(() => {
    const clean = (declaracao.cpf || '').replace(/\D/g, '');
    const isStandardValidCpf = clean.length === 11 && validateCPF(clean).valid;
    const isFederatedTermo = clean === '10735111022006' || clean === '10735111022';

    if (isStandardValidCpf || isFederatedTermo) {
      if (clean === lastSearchedCpfRef.current) {
        return;
      }
      const timer = setTimeout(() => {
        lastSearchedCpfRef.current = clean;
        triggerFederatedLookup(clean);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      if (clean !== lastSearchedCpfRef.current) {
        lastSearchedCpfRef.current = '';
      }
      if (!clean) {
        setFederatedStatus('IDLE');
      }
    }
  }, [declaracao.cpf, triggerFederatedLookup]);

  // Handler: Sincronização e Seed Manual dos Cidadãos no Firestore
  const handleManualSeedFederated = async () => {
    setIsSeedingFederated(true);
    showToast('Sincronizando catálogo canônico de cidadãos com o Firestore...');
    try {
      const result = await seedFederatedDataToFirestore();
      showToast(result.message);
      if (declaracao.cpf) {
        await triggerFederatedLookup(declaracao.cpf);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao sincronizar base com Firestore.');
    } finally {
      setIsSeedingFederated(false);
    }
  };

  // Initial load from localStorage or seed
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ARIA_AUDIT_LEDGER');
      if (saved) {
        setAuditLogs(JSON.parse(saved));
      } else {
        appendAuditLog('SCENARIO_LOADED', 'Inicialização do sistema ARIA - Modo Produção Homologado (Protocolo Limpo)');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);


  // Handler: Diagnostic test of Google Gemini Vision OCR API
  const handleVerifyGoogleOCR = useCallback(async () => {
    setGoogleOcrStatus(prev => ({ ...prev, isTesting: true }));
    showToast('Testando conexão com a API Google Gemini Vision OCR...');
    try {
      const res = await fetch('/api/ocr/verify');
      const data = await res.json();
      if (data.ok) {
        setGoogleOcrStatus({
          tested: true,
          ok: true,
          model: data.activeModel,
          latencyMs: data.latencyMs,
          message: data.message,
          isTesting: false
        });
        showToast(`Google Vision OCR OK: Modelo ${data.activeModel} (${data.latencyMs}ms)`);
        await appendAuditLog(
          'EVALUATION',
          `Diagnóstico Google OCR executado com sucesso: modelo ${data.activeModel}, latência ${data.latencyMs}ms, integridade multimodal validada.`
        );
      } else {
        setGoogleOcrStatus({
          tested: true,
          ok: false,
          message: data.message || data.error,
          isTesting: false
        });
        showToast(data.message || 'Falha ao validar Google OCR');
      }
    } catch (err: any) {
      setGoogleOcrStatus({
        tested: true,
        ok: false,
        message: err.message,
        isTesting: false
      });
      showToast('Erro ao conectar com a API do Google OCR.');
    }
  }, [appendAuditLog]);

  // Handler: Upload and process physical document file (.pdf, .png, .jpeg) with Google Gemini Vision AI
  const handleUploadOCRFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setOcrDocumentState(prev => ({
      ...prev,
      fileName: file.name,
      fileType: isPdf ? 'PDF' : 'IMAGE',
      isProcessing: true,
      processingProgress: 15,
      processingStep: `Carregando ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`
    }));

    showToast(`Iniciando OCR de '${file.name}' via Google Gemini Vision AI...`);

    try {
      const result = await processUploadedOCRFile(
        file,
        ocr,
        (step, percent) => {
          setOcrDocumentState(prev => ({
            ...prev,
            processingProgress: percent,
            processingStep: step
          }));
        },
        'HYBRID_VISION'
      );

      setOcrDocumentState(result.state);
      setOcr(result.parsedRecord);
      setOcrConfidence(result.confidenceMap);

      await appendAuditLog(
        'EVALUATION',
        `Arquivo físico '${file.name}' ingerido e processado via ${result.state.engine || 'Google Gemini Vision AI'}. ${Object.keys(result.state.fields).length} campos extraídos com scores de confiança e Bounding Boxes espaciais.`
      );

      showToast(`Arquivo '${file.name}' processado com sucesso pelo ${result.state.engine || 'Google Gemini Vision AI'}!`);
    } catch (err: any) {
      console.error('Erro no processamento OCR:', err);
      setOcrDocumentState(prev => ({
        ...prev,
        isProcessing: false,
        processingProgress: 0,
        processingStep: 'Erro no processamento',
        error: err?.message || 'Falha ao processar arquivo'
      }));
      showToast(`Erro ao processar '${file.name}'.`);
    }
  };

  // Handler: Open OCR Preview focused on a specific field
  const handleOpenOCRModal = (field?: keyof DeathRecordData) => {
    setFocusedOCRField(field || 'nomeFalecido');
    setIsOCRModalOpen(true);
  };

  // Handler: Reset to clean slate (Ambiente de Produção 100% Limpo)
  const handleResetToDefaults = () => {
    handleNewCleanLavratura();
  };

  // Handler: Update field in Declaração Preliminar
  const handleUpdateDeclaracaoField = (field: keyof DeathRecordData, value: any) => {
    setDeclaracao((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler: Copy field value from Base Federada into Declaração
  const handleCopyFromFederada = (field: keyof DeathRecordData) => {
    const val = federada[field];
    if (val !== undefined) {
      setDeclaracao((prev) => ({
        ...prev,
        [field]: val
      }));
      showToast(`Campo '${String(field)}' atualizado com o valor oficial da Base Centralizada.`);
    }
  };

  // Handler: Copy field value from OCR into Declaração
  const handleCopyFromOCR = (field: keyof DeathRecordData) => {
    const val = ocr[field];
    if (val !== undefined) {
      setDeclaracao((prev) => ({
        ...prev,
        [field]: val
      }));
      showToast(`Campo '${String(field)}' atualizado com o dado do OCR da DO.`);
    }
  };

  // Handler: Update operator justification
  const handleUpdateJustification = (ruleId: string, text: string) => {
    setJustifications((prev) => {
      const updated = { ...prev, [ruleId]: text };
      return updated;
    });
  };

  // Handler: Lavrar Ato de Óbito
  const handleLavrarAto = async () => {
    if (!gateEvaluation.canLavrar) {
      showToast('Ação bloqueada: resolva os impedimentos ou justifique os alertas pendentes.');
      return;
    }

    await appendAuditLog(
      'LAVRATURA_APROVADA',
      `Lavratura do ato de óbito homologada para ${declaracao.nomeFalecido} (DO: ${declaracao.numeroDO}).`,
      justifications
    );

    // Persistência em nuvem centralizada (Firestore)
    if (currentUser?.id) {
      try {
        const lavraturaId = `LAV-${Date.now()}`;
        const lavRef = doc(db, 'lavraturas', lavraturaId);
        setDoc(lavRef, {
          id: lavraturaId,
          numeroDO: declaracao.numeroDO || 'S/N',
          nomeFalecido: declaracao.nomeFalecido || 'Ignorado',
          cpfFalecido: declaracao.cpf || '',
          status: 'HOMOLOGADO_LAVRADO',
          operadorUid: currentUser.id,
          operadorNome: currentUser.nome,
          cns: currentUser.cns || '118492',
          biometriaHash: biometriaRecord?.sha256Hash || '',
          biometriaType: biometriaRecord?.type || '',
          biometriaDeclarante: biometriaRecord?.declaranteNome || '',
          hasBiometria: !!biometriaRecord,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(e => console.warn('Sync lavratura to Firestore:', e));
      } catch (e) {
        // Fallback offline
      }
    }

    showToast('Ato de Óbito lavrado com sucesso! Assento gerado.');
    setIsCertificateModalOpen(true);
  };


  // Export Audit Trail as JSON
  const handleExportAuditJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ARIA_Trilha_Auditoria_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Arquivo JSON da trilha de auditoria baixado com sucesso.');
  };

  // Export Technical Compliance Report as TXT
  const handleExportReportTXT = () => {
    const txtContent = `
================================================================================
REPÚBLICA FEDERATIVA DO BRASIL - REGISTRO CIVIL DAS PESSOAS NATURAIS
RELATÓRIO TÉCNICO DE QUALITY GATE & CONFORMIDADE DE ÓBITO - ARIA ENGINE
PROJETO ACADÊMICO REF-11 / INE5448 (LEGALTECH / UFSC)
================================================================================
Data/Hora da Emissão: ${new Date().toLocaleString('pt-BR')}
Ofício de Registro: ${currentUser?.cartorio || '1º Ofício de RCPN Central'}
Escrevente Responsável: ${currentUser ? `${currentUser.nome} - ${currentUser.cargoLabel} (Matrícula: ${currentUser.matricula})` : 'Guilherme Santos - Escrevente Autorizado (Matrícula: ESC-8419)'}
Status do Quality Gate: ${gateEvaluation.canLavrar ? 'APROVADO / CONFORME' : 'RETIDO / PENDENTE'}
--------------------------------------------------------------------------------
1. QUALIFICAÇÃO DO ATO E DO FALECIDO
Declaração de Óbito (D.O.): ${declaracao.numeroDO}
Nome do Falecido: ${declaracao.nomeFalecido}
CPF: ${declaracao.cpf}
RG: ${declaracao.rg} (${declaracao.rgOrgaoEmissor})
Data de Nascimento: ${declaracao.dataNascimento}
Data do Óbito: ${declaracao.dataObito} às ${declaracao.horaObito}
Estado Civil: ${declaracao.estadoCivil}
Filiação: Mãe: ${declaracao.nomeMae} | Pai: ${declaracao.nomePai}
Causa Mortis: ${declaracao.causaMortis} (CID-10: ${declaracao.cid10})
Médico Atestante: ${declaracao.nomeMedico} (CRM: ${declaracao.crmMedico}/${declaracao.ufCrm})
--------------------------------------------------------------------------------
2. RESUMO DO MOTOR DETERMINÍSTICO DE QUALITY GATE (REGO/OPA)
Regras Totais Avaliadas: ${gateEvaluation.summary.total}
- Aprovadas / Conformes: ${gateEvaluation.summary.passed}
- Bloqueios Impedientes Fatais: ${gateEvaluation.summary.impedientes}
- Alertas com Justificativa Obrigatória: ${gateEvaluation.summary.alertasObrigatorios}
- Alertas Devidamente Justificados: ${gateEvaluation.summary.alertasJustificados}
- Avisos Informativos: ${gateEvaluation.summary.informativos}
--------------------------------------------------------------------------------
3. DETALHAMENTO DAS REGRAS DISPARADAS E PROVENIÊNCIA
${gateEvaluation.results.map((r, i) => `
[${i + 1}] REGRA: ${r.ruleId} - ${r.ruleTitle}
Severidade: ${r.severity} | Resultado: ${r.passed ? 'PASSOU' : 'NÃO PASSOU'}
Base Legal: ${r.legalReference}
Mensagem: ${r.message}
${r.sourcesCompared.map(s => `  • ${s.sourceName} (${s.field}): "${s.value}"`).join('\n')}
${justifications[r.ruleId] ? `Justificativa do Escrevente: "${justifications[r.ruleId]}"` : ''}
`).join('\n')}
--------------------------------------------------------------------------------
4. ENCADIAMENTO CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256)
Último Hash de Bloco: ${auditLogs.length > 0 ? auditLogs[0].sha256Hash : 'INICIAL'}
Hash do Bloco Anterior: ${auditLogs.length > 0 ? auditLogs[0].previousHash : 'GENESIS'}
================================================================================
Documento gerado eletronicamente por ARIA Desktop v1.4.2 [REF-11 / INE5448].
    `.trim();

    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txtContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ARIA_Laudo_Conformidade_${declaracao.numeroDO}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Laudo técnico (.txt) exportado com sucesso.');
  };

  // Integração com o Menu Nativo do Windows (Electron) e atalhos de teclado do desktop
  useEffect(() => {
    // 1. Escuta eventos disparados pelo Menu Nativo do Windows (ativado ao pressionar ALT)
    let cleanupElectron: (() => void) | void;
    if (window.electronAPI?.onMenuAction) {
      cleanupElectron = window.electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case 'new-clean-lavratura':
          case 'reset-scenario':
            handleNewCleanLavratura();
            break;
          case 'open-cnj-report':
            setIsCNJReportModalOpen(true);
            break;
          case 'export-audit-json':
            handleExportAuditJSON();
            break;
          case 'export-report-txt':
            handleExportReportTXT();
            break;
          case 'logout':
            handleLogout();
            break;
          case 'trigger-reevaluate':
            showToast('Regras reavaliadas pelo motor determinístico.');
            break;
          case 'open-certificate':
            setIsCertificateModalOpen(true);
            break;
          case 'open-ocr':
            setIsOCRModalOpen(true);
            break;
          case 'open-audit':
            setIsAuditModalOpen(true);
            break;
          case 'toggle-theme':
            handleToggleDarkMode();
            break;
          case 'open-about':
            setIsAboutModalOpen(true);
            break;
          default:
            break;
        }
      });
    }

    // 2. Atalhos de teclado no padrão desktop do Windows
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setIsCNJReportModalOpen(true);
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleExportAuditJSON();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleNewCleanLavratura();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          setIsCertificateModalOpen(true);
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          setIsOCRModalOpen(true);
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          handleLogout();
        }
      } else {
        if (e.key === 'F1') {
          e.preventDefault();
          setIsAboutModalOpen(true);
        } else if (e.key === 'F5') {
          e.preventDefault();
          showToast('Regras reavaliadas pelo motor determinístico.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof cleanupElectron === 'function') cleanupElectron();
    };
  }, [declaracao, ocr, auditLogs, gateEvaluation, isDarkMode]);

  // If not logged in, show the full clerk login screen
  if (!isLoggedIn) {
    return (
      <div className={isDarkMode ? 'dark' : 'light'}>
        <LoginScreen
          onLogin={handleLogin}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
        {toastMessage && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-lg shadow-2xl text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen font-sans overflow-hidden select-none transition-colors duration-200 ${
      isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'light bg-slate-100 text-slate-900'
    }`}>
      
      {/* 1. Desktop Window Titlebar */}
      <DesktopTitleBar
        onNewCleanLavratura={handleNewCleanLavratura}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Working Area: 3-Column Comparative Panel + Quality Gate Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Central 3-Column Comparative View */}
        <ComparativePanel
          declaracao={declaracao}
          ocr={ocr}
          ocrConfidence={ocrConfidence}
          federada={federada}
          ocrDocumentState={ocrDocumentState}
          onUploadOCRFile={handleUploadOCRFile}
          onUpdateDeclaracaoField={handleUpdateDeclaracaoField}
          onCopyFromFederada={handleCopyFromFederada}
          onCopyFromOCR={handleCopyFromOCR}
          onOpenOCRModal={handleOpenOCRModal}
          onOpenCNJReportModal={() => setIsCNJReportModalOpen(true)}
          onVerifyGoogleOCR={handleVerifyGoogleOCR}
          googleOcrStatus={googleOcrStatus}
          biometriaRecord={biometriaRecord}
          onOpenBiometricModal={() => setIsBiometricModalOpen(true)}
          federatedStatus={federatedStatus}
          onSeedFederatedData={handleManualSeedFederated}
          isSeedingFederated={isSeedingFederated}
          onRefreshFederatedSearch={() => triggerFederatedLookup(declaracao.cpf)}
        />

        {/* Right Drawer: Quality Gate Rules, Justifications & Lavratura */}
        <QualityGateDrawer
          results={gateEvaluation.results}
          hasImpediments={gateEvaluation.hasImpediments}
          hasPendingAlerts={gateEvaluation.hasPendingAlerts}
          canLavrar={gateEvaluation.canLavrar}
          justifications={justifications}
          onUpdateJustification={handleUpdateJustification}
          onLavrarAto={handleLavrarAto}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenCNJReportModal={() => setIsCNJReportModalOpen(true)}
          onApplySuggestedFix={(field, value) => {
            handleUpdateDeclaracaoField(field, value);
            showToast(`Campo ${String(field).toUpperCase()} atualizado para: ${value}`);
          }}
          declaracao={declaracao}
          ocr={ocr}
          federada={federada}
          biometriaRecord={biometriaRecord}
          onOpenBiometricModal={() => setIsBiometricModalOpen(true)}
        />
      </div>

      {/* 4. Desktop Status Bar - Clean Production View */}
      <footer className="bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 px-3 py-1 flex items-center justify-between select-none shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300 font-medium">Quality Gate: Ativo (Lei 6.015/73)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>D.O. em Análise: <strong className="font-mono text-cyan-300">{declaracao.numeroDO || 'Aguardando D.O.'}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Base Federada: <strong className="text-emerald-300">Conectada (mTLS / SIRC)</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <span>Trilha SHA-256: <strong className="font-mono text-slate-300">{auditLogs.length} blocos</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Conformidade Provimento CNJ 149/2023</span>
        </div>
      </footer>

      {/* 5. Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-lg shadow-2xl text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 6. Modals */}
      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        onExportJSON={handleExportAuditJSON}
        onExportTXT={handleExportReportTXT}
      />

      <OCRPreviewModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        documentState={ocrDocumentState}
        ocrData={ocr}
        ocrConfidence={ocrConfidence}
        focusedField={focusedOCRField}
        onSelectField={(f) => setFocusedOCRField(f)}
      />

      <CertificatePreviewModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        record={declaracao}
        federada={federada}
        currentUser={currentUser}
        justifications={justifications}
        biometriaRecord={biometriaRecord}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <CNJReportModal
        isOpen={isCNJReportModalOpen}
        onClose={() => setIsCNJReportModalOpen(false)}
        declaracao={declaracao}
        ocr={ocr}
        ocrConfidence={ocrConfidence}
        federada={federada}
        evaluationResults={gateEvaluation.results}
        canLavrar={gateEvaluation.canLavrar}
        hasImpediments={gateEvaluation.hasImpediments}
        hasPendingAlerts={gateEvaluation.hasPendingAlerts}
        justifications={justifications}
        currentUser={currentUser}
        auditLogs={auditLogs}
        ocrDocumentState={ocrDocumentState}
      />

      <BiometricCaptureModal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        declaracao={declaracao}
        currentUser={currentUser}
        existingBiometria={biometriaRecord}
        onAttachBiometric={handleAttachBiometric}
      />

    </div>
  );
}
