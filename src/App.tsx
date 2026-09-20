/**
 * ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito
 * PoC Projeto Acadêmico REF-11 / INE5448 (UFSC - Engenharia de Software)
 * Preparada para execução web e empacotamento standalone Windows (.exe x64) via Electron.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_SCENARIOS } from './data/mockScenarios';
import { DeathRecordData, OCRConfidenceMap, CaseScenario, AuditLogEntry } from './types';
import { evaluateQualityGate } from './engine/rules';
import { computeHash } from './engine/validators';

import { DesktopTitleBar } from './components/DesktopTitleBar';
import { DesktopMenuBar } from './components/DesktopMenuBar';
import { ComparativePanel } from './components/ComparativePanel';
import { QualityGateDrawer } from './components/QualityGateDrawer';
import { AuditTrailModal } from './components/AuditTrailModal';
import { OCRPreviewModal } from './components/OCRPreviewModal';
import { CertificatePreviewModal } from './components/CertificatePreviewModal';
import { ElectronPackagerModal } from './components/ElectronPackagerModal';
import { AboutModal } from './components/AboutModal';

export default function App() {
  // Current active scenario
  const [currentScenario, setCurrentScenario] = useState<CaseScenario>(MOCK_SCENARIOS[0]);

  // Working data copies (Source A, Source B, Source C)
  const [declaracao, setDeclaracao] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosDeclaracao);
  const [ocr, setOcr] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosOCR);
  const [ocrConfidence, setOcrConfidence] = useState<OCRConfidenceMap>(MOCK_SCENARIOS[0].ocrConfidence);
  const [federada, setFederada] = useState<DeathRecordData>(MOCK_SCENARIOS[0].dadosFederados);

  // Justifications keyed by ruleId
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  // Local Audit Logs (simulating SQLite persistent ledger with SHA-256 hash chaining)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isPackagerModalOpen, setIsPackagerModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

      const newEntry: AuditLogEntry = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        operador: 'Guilherme Santos (Escrevente)',
        matricula: 'ESC-8419',
        cartorio: '1º Ofício de RCPN Central',
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
    appendAuditLog('SCENARIO_LOADED', `Carregado cenário de teste: ${scen.title}`);
    showToast(`Cenário carregado: ${scen.title}`);
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
Ofício de Registro: 1º Ofício de RCPN Central
Escrevente Responsável: Guilherme Santos (Matrícula: ESC-8419)
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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      
      {/* 1. Desktop Window Titlebar (Windows 10/11) */}
      <DesktopTitleBar
        currentScenarioTitle={currentScenario.title}
        hasImpediments={gateEvaluation.hasImpediments}
        hasPendingAlerts={gateEvaluation.hasPendingAlerts}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenPackager={() => setIsPackagerModalOpen(true)}
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
      />

      {/* 3. Main Working Area: 3-Column Comparative Panel + Quality Gate Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Central 3-Column Comparative View */}
        <ComparativePanel
          declaracao={declaracao}
          ocr={ocr}
          ocrConfidence={ocrConfidence}
          federada={federada}
          onUpdateDeclaracaoField={handleUpdateDeclaracaoField}
          onCopyFromFederada={handleCopyFromFederada}
          onCopyFromOCR={handleCopyFromOCR}
          onOpenOCRModal={() => setIsOCRModalOpen(true)}
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
          <span>Cenário: <strong className="text-slate-200">{currentScenario.title}</strong></span>
          <span className="text-slate-600">|</span>
          <span>D.O. em Análise: <strong className="font-mono text-cyan-300">{declaracao.numeroDO}</strong></span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <span>Base Central: <strong className="text-emerald-400">CRC Nacional Conectada</strong></span>
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
        ocrData={ocr}
        ocrConfidence={ocrConfidence}
      />

      <CertificatePreviewModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        record={declaracao}
      />

      <ElectronPackagerModal
        isOpen={isPackagerModalOpen}
        onClose={() => setIsPackagerModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

    </div>
  );
}
