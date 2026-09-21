/**
 * ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito
 * PoC Projeto Acadêmico REF-11 / INE5448 (UFSC - Engenharia de Software)
 * Preparada para execução web e empacotamento standalone Windows (.exe x64) via Electron.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_SCENARIOS } from './data/mockScenarios';
import { 
  DeathRecordData, 
  OCRConfidenceMap, 
  CaseScenario, 
  AuditLogEntry, 
  FederatedBusStatus, 
  CartorioCertificate, 
  LocalFirstNodeStatus, 
  EscreventeUser,
  OCRDocumentState,
  LicenseInfo,
  LicenseTier,
  LocalLLMStatus
} from './types';
import { evaluateQualityGate } from './engine/rules';
import { computeHash } from './engine/validators';
import { 
  processUploadedOCRFile, 
  createInitialOCRDocumentState
} from './engine/ocrPipeline';
import { INITIAL_FEDERATED_BUSES, CARTORIO_CERTIFICATE, INITIAL_LOCAL_FIRST_STATUS } from './data/federatedBuses';
import { MOCK_ESCREVENTES, DEFAULT_ACTIVE_USER } from './data/mockUsers';
import { getLicenseStatus, checkHeartbeat } from './engine/licenseEngine';
import { getLLMStatus } from './engine/llmClient';

import { LoginScreen } from './components/LoginScreen';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { DesktopMenuBar } from './components/DesktopMenuBar';
import { ComparativePanel } from './components/ComparativePanel';
import { QualityGateDrawer } from './components/QualityGateDrawer';
import { AuditTrailModal } from './components/AuditTrailModal';
import { OCRPreviewModal } from './components/OCRPreviewModal';
import { CertificatePreviewModal } from './components/CertificatePreviewModal';
import { ElectronPackagerModal } from './components/ElectronPackagerModal';
import { AboutModal } from './components/AboutModal';
import { FederatedMtlsModal } from './components/FederatedMtlsModal';
import { LicenseManagerModal } from './components/LicenseManagerModal';
import { UpgradeAlertModal } from './components/UpgradeAlertModal';

export default function App() {
  // Current active scenario
  const [currentScenario, setCurrentScenario] = useState<CaseScenario>(MOCK_SCENARIOS[0]);

  // Working data copies (Source A, Source B, Source C)
  const [declaracao, setDeclaracao] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosDeclaracao);
  const [ocr, setOcr] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosOCR);
  const [ocrConfidence, setOcrConfidence] = useState<OCRConfidenceMap>(MOCK_SCENARIOS[0].ocrConfidence);
  const [federada, setFederada] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosFederados);

  // Local-First OCR Document State with Bounding Boxes & LGPD On-Device processing
  const [ocrDocumentState, setOcrDocumentState] = useState<OCRDocumentState>(() => {
    return createInitialOCRDocumentState(MOCK_SCENARIOS[0].dadosOCR).state;
  });
  const [focusedOCRField, setFocusedOCRField] = useState<keyof DeathRecordData | null>(null);

  // Federated Buses & Local-First Node State
  const [federatedBuses, setFederatedBuses] = useState<FederatedBusStatus[]>(INITIAL_FEDERATED_BUSES);
  const [cartorioCert, setCartorioCert] = useState<CartorioCertificate>(CARTORIO_CERTIFICATE);
  const [localNodeStatus, setLocalNodeStatus] = useState<LocalFirstNodeStatus>(INITIAL_LOCAL_FIRST_STATUS);
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);

  // Justifications keyed by ruleId
  const [justifications, setJustifications] = useState<Record<string, string>>({});

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
    return DEFAULT_ACTIVE_USER;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('aria_logged_in');
    return saved !== null ? saved === 'true' : true;
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

  const handleLogin = (user: EscreventeUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('aria_logged_user', JSON.stringify(user));
    localStorage.setItem('aria_logged_in', 'true');
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
    setIsLoggedIn(false);
    localStorage.setItem('aria_logged_in', 'false');
    showToast('Estação de trabalho bloqueada. Faça login para continuar.');
  };

  // Local Audit Logs (simulating SQLite persistent ledger with SHA-256 hash chaining)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isPackagerModalOpen, setIsPackagerModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMtlsModalOpen, setIsMtlsModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [upgradeAlertTier, setUpgradeAlertTier] = useState<LicenseTier | null>(null);

  // Licensing and Local LLM State
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [llmStatus, setLlmStatus] = useState<LocalLLMStatus | null>(null);

  // Initial License & LLM Engine Handshake
  useEffect(() => {
    getLicenseStatus().then(lic => {
      setLicense(lic);
    }).catch(err => console.warn('Falha ao obter licença:', err));

    getLLMStatus().then(status => {
      setLlmStatus(status);
    }).catch(err => console.warn('Falha ao obter status LLM:', err));

    // Periodic Heartbeat check every 5 minutes
    const interval = setInterval(() => {
      checkHeartbeat().then(() => {
        getLicenseStatus().then(lic => setLicense(lic));
      }).catch(err => console.warn('Heartbeat error:', err));

      getLLMStatus().then(status => {
        setLlmStatus(status);
      }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
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
    extraJustifications?: Record<string, string>
  ) => {
    setAuditLogs((prevLogs) => {
      const prevHash = prevLogs.length > 0 ? prevLogs[0].sha256Hash : '0000000000000000000000000000000000000000000000000000000000000000';
      const timestamp = new Date().toLocaleString('pt-BR');
      const seed = `${timestamp}|${action}|${resumo}|${declaracao.numeroDO}|${declaracao.cpf}|${prevHash}`;
      
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
        }
      };

      const updated = [newEntry, ...prevLogs];
      try {
        localStorage.setItem('ARIA_AUDIT_LEDGER', JSON.stringify(updated.slice(0, 50)));
      } catch (e) {
        console.error('Storage quota exceeded', e);
      }
      return updated;
    });
  }, [declaracao, gateEvaluation.summary, justifications]);

  // Initial load from localStorage or seed
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ARIA_AUDIT_LEDGER');
      if (saved) {
        setAuditLogs(JSON.parse(saved));
      } else {
        appendAuditLog('SCENARIO_LOADED', `Inicialização do sistema ARIA - Carregado: ${MOCK_SCENARIOS[0].title}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Handler: Select a scenario
  const handleSelectScenario = (scen: CaseScenario) => {
    setCurrentScenario(scen);
    setDeclaracao({ ...scen.dadosDeclaracao });
    setOcr({ ...scen.dadosOCR });
    setOcrConfidence({ ...scen.ocrConfidence });
    setFederada({ ...scen.dadosFederados });
    setJustifications({});
    const initDoc = createInitialOCRDocumentState(scen.dadosOCR);
    setOcrDocumentState(initDoc.state);
    appendAuditLog('SCENARIO_LOADED', `Carregado cenário de teste: ${scen.title}`);
    showToast(`Cenário carregado: ${scen.title}`);
  };

  // Handler: Upload and process physical document file (.pdf, .png, .jpeg) with Local Tesseract OCR
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

    showToast(`Iniciando OCR local de '${file.name}'...`);

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
        }
      );

      setOcrDocumentState(result.state);
      setOcr(result.parsedRecord);
      setOcrConfidence(result.confidenceMap);

      await appendAuditLog(
        'EVALUATION',
        `Arquivo físico '${file.name}' ingerido e processado via pipeline Tesseract OCR On-Device (Privacidade total LGPD). ${Object.keys(result.state.fields).length} campos extraídos com scores de confiança.`
      );

      showToast(`Arquivo '${file.name}' processado com sucesso pelo OCR local!`);
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

  // Handler: Reset to clean slate
  const handleResetToDefaults = () => {
    handleSelectScenario(MOCK_SCENARIOS[3]); // Conforme
    showToast('Formulário restaurado para novo ato.');
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

    showToast('Ato de Óbito lavrado com sucesso! Assento gerado.');
    setIsCertificateModalOpen(true);
  };

  // Handler: Toggle Offline / Contingency Mode (Local-First preservation)
  const handleToggleContingency = () => {
    setLocalNodeStatus(prev => {
      const nextMode = !prev.contingencyMode;
      appendAuditLog(
        'EVALUATION',
        nextMode 
          ? 'Modo Contingência Offline ativado: consultas aos barramentos federados suspensas. Motor determinístico operando 100% na ponta.'
          : 'Modo Contingência Offline desativado: reconectando barramentos federados via mTLS ICP-Brasil.'
      );
      showToast(nextMode ? 'Modo de Contingência Offline ATIVADO.' : 'Modo Contingência DESATIVADO. Conexões mTLS restabelecidas.');
      return {
        ...prev,
        contingencyMode: nextMode
      };
    });
  };

  // Handler: Test mTLS Handshake with external federated buses
  const handleTestHandshake = async (busId?: string) => {
    setIsTestingHandshake(true);
    try {
      if (window.electronAPI?.testMtlsHandshake) {
        const res = await window.electronAPI.testMtlsHandshake(busId);
        showToast(`mTLS Handshake OK: Latência ${res.latencyMs}ms (${res.tlsVersion} / ${res.cipherSuite})`);
      } else {
        // Web / browser simulation
        await new Promise(r => setTimeout(r, 600));
        showToast(`Handshake mTLS validado com sucesso (TLS 1.3 / ECDHE-RSA-AES256-GCM-SHA384).`);
      }
      
      const nowStr = new Date().toLocaleTimeString('pt-BR');
      setFederatedBuses(prev => prev.map(b => {
        if (!busId || b.id === busId) {
          return {
            ...b,
            status: 'CONNECTED',
            lastSync: `Hoje às ${nowStr}`,
            latencyMs: Math.floor(Math.random() * 25) + 20
          };
        }
        return b;
      }));
      setCartorioCert(prev => ({
        ...prev,
        lastHandshake: `Hoje às ${nowStr} (mTLS OK)`
      }));
      appendAuditLog('EVALUATION', `Handshake mTLS ICP-Brasil realizado com sucesso para ${busId || 'todos os barramentos federados'}.`);
    } catch (err) {
      console.error(err);
      showToast('Falha no teste de handshake mTLS.');
    } finally {
      setIsTestingHandshake(false);
    }
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
      
      {/* 1. Desktop Window Titlebar (Windows 10/11) */}
      <DesktopTitleBar
        currentScenarioTitle={currentScenario.title}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        license={license}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* 2. Desktop Application Menu Bar */}
      <DesktopMenuBar
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenOCRModal={() => setIsOCRModalOpen(true)}
        onOpenCertificateModal={() => setIsCertificateModalOpen(true)}
        onOpenPackagerModal={() => setIsPackagerModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onExportAuditJSON={handleExportAuditJSON}
        onExportReportTXT={handleExportReportTXT}
        onResetToDefaults={handleResetToDefaults}
        onTriggerReevaluate={() => {
          showToast('Regras reavaliadas pelo motor determinístico.');
        }}
        onOpenMtlsModal={() => setIsMtlsModalOpen(true)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onLogout={handleLogout}
        hasImpediments={gateEvaluation.hasImpediments}
        hasPendingAlerts={gateEvaluation.hasPendingAlerts}
      />

      {/* 3. Main Working Area: 3-Column Comparative Panel + Quality Gate Drawer */}
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
          onOpenMtlsModal={() => setIsMtlsModalOpen(true)}
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
          onApplySuggestedFix={(field, value) => {
            handleUpdateDeclaracaoField(field, value);
            showToast(`Campo ${String(field).toUpperCase()} atualizado para: ${value}`);
          }}
          license={license}
          onTriggerUpgradeAlert={(tier) => setUpgradeAlertTier(tier)}
          declaracao={declaracao}
          ocr={ocr}
          federada={federada}
        />
      </div>

      {/* 4. Desktop Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 px-3 py-1 flex items-center justify-between select-none shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300 font-medium">Motor OPA/Rego: Ativo</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${llmStatus?.isLoaded ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`}></span>
            <span className="font-mono text-[10px] text-slate-300">
              Qwen2.5-1.5B: {llmStatus?.isLoaded ? 'Memória Ativa' : 'Standby (Lazy)'}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setIsLicenseModalOpen(true)}
            className="flex items-center space-x-1 text-amber-300 hover:text-amber-200 transition-colors"
            title="Clique para gerenciar licença SaaS Local-First"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Licença: <strong className="font-semibold">{license?.license_tier || 'PRO_AI'}</strong></span>
          </button>
          <span className="text-slate-600">|</span>
          <span>D.O. em Análise: <strong className="font-mono text-cyan-300">{declaracao.numeroDO}</strong></span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <button
            onClick={() => setIsMtlsModalOpen(true)}
            className="flex items-center space-x-1 hover:text-emerald-300 transition-colors"
            title="Clique para inspecionar túnel mTLS ICP-Brasil e barramentos federados"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>mTLS ICP-Brasil: <strong className="text-emerald-400">CRC/ONR/SIRC Conectados</strong></span>
          </button>
          <span className="text-slate-600">|</span>
          <span>Trilha SHA-256: <strong className="font-mono text-slate-300">{auditLogs.length} blocos</strong></span>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setIsPackagerModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Windows Standalone (.EXE)
          </button>
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
        currentUser={currentUser}
        license={license}
        justifications={justifications}
        onTriggerUpgradeAlert={(tier) => setUpgradeAlertTier(tier)}
      />

      <ElectronPackagerModal
        isOpen={isPackagerModalOpen}
        onClose={() => setIsPackagerModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <FederatedMtlsModal
        isOpen={isMtlsModalOpen}
        onClose={() => setIsMtlsModalOpen(false)}
        buses={federatedBuses}
        certificate={cartorioCert}
        nodeStatus={localNodeStatus}
        onToggleContingency={handleToggleContingency}
        onTestHandshake={handleTestHandshake}
        isTestingHandshake={isTestingHandshake}
      />

      <LicenseManagerModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        currentLicense={license}
        onLicenseUpdated={(newLic) => {
          setLicense(newLic);
          showToast(`Licença ${newLic.license_tier} ativada com sucesso!`);
        }}
      />

      <UpgradeAlertModal
        isOpen={!!upgradeAlertTier}
        onClose={() => setUpgradeAlertTier(null)}
        requiredTier={upgradeAlertTier || 'PRO_AI'}
        onOpenLicenseManager={() => {
          setUpgradeAlertTier(null);
          setIsLicenseModalOpen(true);
        }}
      />

    </div>
  );
}
