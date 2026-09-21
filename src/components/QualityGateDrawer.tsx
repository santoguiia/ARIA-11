import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Info, 
  CheckCircle2, 
  FileSignature, 
  BookOpen, 
  Send, 
  Layers, 
  Lock, 
  Unlock,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { RuleEvaluationResult, RuleSeverity, DeathRecordData, LicenseInfo, LicenseTier } from '../types';
import { DiffHighlight } from '../engine/diffHighlight';
import { requestLLMJustification } from '../engine/llmClient';

interface QualityGateDrawerProps {
  results: RuleEvaluationResult[];
  hasImpediments: boolean;
  hasPendingAlerts: boolean;
  canLavrar: boolean;
  justifications: Record<string, string>;
  onUpdateJustification: (ruleId: string, text: string) => void;
  onLavrarAto: () => void;
  onOpenAuditModal: () => void;
  onApplySuggestedFix?: (field: keyof DeathRecordData, value: string) => void;
  license?: LicenseInfo | null;
  onTriggerUpgradeAlert?: (requiredTier: LicenseTier) => void;
  declaracao?: DeathRecordData;
  ocr?: DeathRecordData;
  federada?: DeathRecordData;
}

export const QualityGateDrawer: React.FC<QualityGateDrawerProps> = ({
  results,
  hasImpediments,
  hasPendingAlerts,
  canLavrar,
  justifications,
  onUpdateJustification,
  onLavrarAto,
  onOpenAuditModal,
  onApplySuggestedFix,
  license,
  onTriggerUpgradeAlert,
  declaracao,
  ocr,
  federada
}) => {
  const [filter, setFilter] = useState<'TODAS' | 'FALHAS' | 'BLOQUEIO' | 'ALERTA'>('TODAS');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [generatingJustificationMap, setGeneratingJustificationMap] = useState<Record<string, boolean>>({});
  const [llmMetaMap, setLlmMetaMap] = useState<Record<string, { source: string; durationMs: number }>>({});

  const handleRequestAIJustification = async (item: RuleEvaluationResult) => {
    // Verificação de Feature Flag da Licença
    if (license && !license.canUseLocalLLM) {
      onTriggerUpgradeAlert?.('PRO_AI');
      return;
    }

    setGeneratingJustificationMap((prev) => ({ ...prev, [item.ruleId]: true }));

    try {
      const res = await requestLLMJustification({
        ruleId: item.ruleId,
        ruleTitle: item.ruleTitle,
        legalReference: item.legalReference,
        diffSummary: item.message,
        declaracao: declaracao || ({} as DeathRecordData),
        ocr: ocr || ({} as DeathRecordData),
        federada: federada || ({} as DeathRecordData)
      });

      if (res.success && res.justification) {
        onUpdateJustification(item.ruleId, res.justification);
        setLlmMetaMap((prev) => ({
          ...prev,
          [item.ruleId]: {
            source: res.source || 'Qwen2.5-1.5B (GGUF On-Device)',
            durationMs: res.durationMs || 450
          }
        }));
      } else if (res.error === 'UPGRADE_REQUIRED') {
        onTriggerUpgradeAlert?.('PRO_AI');
      }
    } catch (err) {
      console.warn('Erro ao gerar justificativa:', err);
    } finally {
      setGeneratingJustificationMap((prev) => ({ ...prev, [item.ruleId]: false }));
    }
  };

  const impedientes = results.filter(r => !r.passed && r.severity === 'BLOQUEIO_IMPEDIENTE');
  const alertas = results.filter(r => !r.passed && r.severity === 'ALERTA_OBRIGATORIO');
  const informativos = results.filter(r => !r.passed && r.severity === 'INFORMATIVO');
  const conformes = results.filter(r => r.passed);

  const filteredResults = results.filter(r => {
    if (filter === 'FALHAS') return !r.passed;
    if (filter === 'BLOQUEIO') return !r.passed && r.severity === 'BLOQUEIO_IMPEDIENTE';
    if (filter === 'ALERTA') return !r.passed && r.severity === 'ALERTA_OBRIGATORIO';
    return true;
  });

  const toggleExpand = (ruleId: string) => {
    setExpandedRule(expandedRule === ruleId ? null : ruleId);
  };

  return (
    <aside className="w-full lg:w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none text-slate-200 shadow-xl shrink-0">
      {/* Top Banner: Quality Gate Decision */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">Quality Gate ARIA</span>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
            Engine OPA/Rego
          </span>
        </div>

        {/* Big Status Card */}
        {hasImpediments ? (
          <div className="bg-rose-950/80 border border-rose-700/80 rounded-lg p-3 text-rose-200">
            <div className="flex items-center space-x-2 font-bold text-xs text-rose-300">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>LAVRATURA BLOQUEADA</span>
            </div>
            <p className="text-[11px] text-rose-200/90 mt-1 leading-relaxed">
              Existem <strong>{impedientes.length} impedimento(s) fatal(is)</strong> que violam a Lei 6.015/73 ou a integridade dos dados cadastrais. Corrija na Declaração para liberar o ato.
            </p>
          </div>
        ) : hasPendingAlerts ? (
          <div className="bg-amber-950/80 border border-amber-700/80 rounded-lg p-3 text-amber-200">
            <div className="flex items-center space-x-2 font-bold text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>JUSTIFICATIVA OBRIGATÓRIA PENDENTE</span>
            </div>
            <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
              Divergências identificadas com exigência legal de justificativa formal fundamentada pelo escrevente do ato.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-950/80 border border-emerald-700/80 rounded-lg p-3 text-emerald-200">
            <div className="flex items-center space-x-2 font-bold text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>QUALIDADE APROVADA - APTO PARA LAVRATURA</span>
            </div>
            <p className="text-[11px] text-emerald-200/90 mt-1 leading-relaxed">
              Todas as validações determinísticas de cronologia, filiação, CPF e OCR foram satisfeitas ou devidamente justificadas.
            </p>
          </div>
        )}

        {/* Severity Metrics Chips */}
        <div className="grid grid-cols-4 gap-1 mt-2.5 text-center text-[10px]">
          <button
            onClick={() => setFilter('BLOQUEIO')}
            className={`p-1 rounded border transition-colors ${
              filter === 'BLOQUEIO' ? 'ring-1 ring-white' : ''
            } ${impedientes.length > 0 ? 'bg-rose-950/60 border-rose-800 text-rose-300 font-bold' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
            <div>{impedientes.length}</div>
            <div className="text-[9px] truncate">Bloqueios</div>
          </button>

          <button
            onClick={() => setFilter('ALERTA')}
            className={`p-1 rounded border transition-colors ${
              filter === 'ALERTA' ? 'ring-1 ring-white' : ''
            } ${alertas.length > 0 ? 'bg-amber-950/60 border-amber-800 text-amber-300 font-bold' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
            <div>{alertas.length}</div>
            <div className="text-[9px] truncate">Alertas</div>
          </button>

          <button
            onClick={() => setFilter('FALHAS')}
            className={`p-1 rounded border transition-colors ${
              filter === 'FALHAS' ? 'ring-1 ring-white' : ''
            } ${informativos.length > 0 ? 'bg-blue-950/60 border-blue-800 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
            <div>{informativos.length}</div>
            <div className="text-[9px] truncate">Informativos</div>
          </button>

          <button
            onClick={() => setFilter('TODAS')}
            className={`p-1 rounded border transition-colors ${
              filter === 'TODAS' ? 'ring-1 ring-white' : ''
            } bg-emerald-950/40 border-emerald-800/80 text-emerald-400 font-bold`}
          >
            <div>{conformes.length}</div>
            <div className="text-[9px] truncate">Conformes</div>
          </button>
        </div>
      </div>

      {/* Rules Evaluation List (Explainability Panel) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Explicabilidade & Proveniência ({filteredResults.length} regras)
          </span>
          <span className="text-[10px] text-slate-500">CrossCheck Determinístico</span>
        </div>

        {filteredResults.map((item) => {
          const isExpanded = expandedRule === item.ruleId;
          const isFailing = !item.passed;
          const justification = justifications[item.ruleId] || '';
          const hasSufficientJustification = justification.trim().length >= 10;

          return (
            <div
              key={item.ruleId}
              className={`rounded-lg border transition-all text-xs ${
                item.severity === 'BLOQUEIO_IMPEDIENTE' && isFailing
                  ? 'bg-rose-950/30 border-rose-800/70'
                  : item.severity === 'ALERTA_OBRIGATORIO' && isFailing
                  ? hasSufficientJustification
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : 'bg-amber-950/40 border-amber-700'
                  : item.severity === 'INFORMATIVO' && isFailing
                  ? 'bg-blue-950/20 border-blue-800/60'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}
            >
              {/* Header Bar */}
              <div
                onClick={() => toggleExpand(item.ruleId)}
                className="p-2.5 flex items-start justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start space-x-2">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : item.severity === 'BLOQUEIO_IMPEDIENTE' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : item.severity === 'ALERTA_OBRIGATORIO' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  )}

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{item.ruleId}</span>
                      <SeverityBadge severity={item.severity} passed={item.passed} />
                    </div>
                    <div className="font-semibold text-slate-200 mt-0.5 leading-snug">{item.ruleTitle}</div>
                  </div>
                </div>

                <button className="text-slate-400 hover:text-white p-0.5">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Collapsible Details */}
              {(isExpanded || isFailing) && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 text-[11px] space-y-2">
                  {/* Outcome Message */}
                  <div className={`p-2 rounded font-medium leading-relaxed ${
                    item.passed 
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' 
                      : item.severity === 'BLOQUEIO_IMPEDIENTE'
                      ? 'bg-rose-950/60 text-rose-200 border border-rose-800'
                      : 'bg-amber-950/50 text-amber-200 border border-amber-800'
                  }`}>
                    {item.message}
                  </div>

                  {/* Provenance comparison table */}
                  {item.sourcesCompared && item.sourcesCompared.length > 0 && (
                    <div className="bg-slate-950/70 rounded p-2 border border-slate-800 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                        <span>Proveniência dos Dados Confrontados:</span>
                        {!item.passed && item.sourcesCompared.length >= 2 && (
                          <span className="text-[9px] font-mono text-rose-400 bg-rose-950/60 px-1 rounded border border-rose-800">
                            Divergência em vermelho
                          </span>
                        )}
                      </div>
                      {item.sourcesCompared.map((src, idx) => {
                        // Compare against the primary or adjacent source to highlight discrepancy in red
                        const compareTarget = idx === 0 
                          ? (item.sourcesCompared[1]?.value || '') 
                          : (item.sourcesCompared[0]?.value || '');

                        return (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">
                              {src.sourceName} <span className="text-slate-500 font-mono">({src.field})</span>:
                            </span>
                            <span className="font-mono text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded truncate max-w-[210px] border border-slate-800">
                              {!item.passed && compareTarget ? (
                                <DiffHighlight current={src.value || '(Vazio)'} reference={compareTarget} />
                              ) : (
                                src.value || '(Vazio)'
                              )}
                              {src.confidence !== undefined && (
                                <span className="ml-1 text-[9px] text-amber-400">[{src.confidence}%]</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Legal reference */}
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Fundamento Legal: <strong className="text-slate-300">{item.legalReference}</strong></span>
                  </div>

                  {/* 1-Click Suggested Fix Action */}
                  {!item.passed && item.suggestedFix && onApplySuggestedFix && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onApplySuggestedFix(item.suggestedFix!.field, item.suggestedFix!.value)}
                        className="w-full py-1.5 px-3 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-emerald-100 rounded text-xs font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span>{item.suggestedFix.label}</span>
                      </button>
                    </div>
                  )}

                  {/* Justification Field for ALERTA_OBRIGATORIO */}
                  {item.severity === 'ALERTA_OBRIGATORIO' && !item.passed && (
                    <div className="mt-2 pt-2 border-t border-amber-800/40 bg-amber-950/30 p-2.5 rounded border border-amber-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                          <FileSignature className="w-3 h-3 text-amber-400" />
                          <span>Justificativa Obrigatória do Escrevente:</span>
                        </label>
                        <span className={`text-[10px] font-mono ${
                          hasSufficientJustification ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {justification.length}/10 caracteres mín.
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        value={justification}
                        onChange={(e) => onUpdateJustification(item.ruleId, e.target.value)}
                        placeholder="Ex: Apresentada certidão retificadora de casamento nº 14092 expedida em 2024 que comprova a divergência de grafia..."
                        className="w-full bg-slate-950 border border-amber-700/80 rounded p-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none font-sans"
                      />

                      {/* AI Copilot Suggestion Button */}
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleRequestAIJustification(item)}
                          disabled={generatingJustificationMap[item.ruleId]}
                          className={`py-1 px-2.5 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-all shadow-xs ${
                            license && !license.canUseLocalLLM
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          }`}
                          title={
                            license && !license.canUseLocalLLM
                              ? 'Requer Licença Pro AI ou superior. Clique para ver detalhes.'
                              : 'Gerar minuta de motivação com modelo Qwen2.5-1.5B local on-device (sem enviar à nuvem)'
                          }
                        >
                          {generatingJustificationMap[item.ruleId] ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                              <span>Inferindo com Qwen2.5 local...</span>
                            </>
                          ) : (
                            <>
                              {license && !license.canUseLocalLLM ? (
                                <Lock className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Cpu className="w-3 h-3 text-amber-400" />
                              )}
                              <span>Sugerir com IA Local (Qwen 1.5B)</span>
                            </>
                          )}
                        </button>

                        {llmMetaMap[item.ruleId] && (
                          <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Qwen 1.5B ({llmMetaMap[item.ruleId].durationMs}ms)</span>
                          </span>
                        )}
                      </div>

                      {hasSufficientJustification ? (
                        <div className="flex items-center space-x-1 text-[10px] text-emerald-400 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Justificativa registrada e vinculada à trilha de auditoria.</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-400 mt-1">
                          * Lavratura do ato bloqueada até o preenchimento da motivação registral.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer: Lavratura Button & Audit Link */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
        <button
          disabled={!canLavrar}
          onClick={onLavrarAto}
          className={`w-full py-2.5 px-3 rounded-md font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md ${
            canLavrar
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer active:scale-[0.99]'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          {canLavrar ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>LAVRAR ATO DE ÓBITO & EMITIR TRASLADO</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>LAVRATURA RETIDA PELO QUALITY GATE</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Trilha SHA-256 Ativa</span>
          </span>
          <button
            onClick={onOpenAuditModal}
            className="text-cyan-400 hover:underline hover:text-cyan-300 font-medium"
          >
            Ver Logs de Auditoria &rarr;
          </button>
        </div>
      </div>
    </aside>
  );
};

// Helper badge component for severity
const SeverityBadge: React.FC<{ severity: RuleSeverity; passed: boolean }> = ({ severity, passed }) => {
  if (passed) {
    return (
      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
        CONFORME
      </span>
    );
  }

  if (severity === 'BLOQUEIO_IMPEDIENTE') {
    return (
      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
        BLOQUEIO
      </span>
    );
  }

  if (severity === 'ALERTA_OBRIGATORIO') {
    return (
      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
        ALERTA OBRIGATÓRIO
      </span>
    );
  }

  return (
    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
      INFORMATIVO
    </span>
  );
};
