import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Cpu, 
  RefreshCw, 
  Check, 
  Copy, 
  Clock, 
  Building2, 
  X, 
  AlertCircle, 
  Lock, 
  Sparkles, 
  Network, 
  Laptop, 
  Database,
  Trash2
} from 'lucide-react';
import { LicenseInfo, LicenseTier, LocalLLMStatus } from '../types';
import { 
  LICENSE_TIER_CONFIGS, 
  DEMO_LICENSE_KEYS, 
  activateLicense, 
  triggerHeartbeat 
} from '../engine/licenseEngine';
import { fetchLLMStatus } from '../engine/llmClient';

interface LicenseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: LicenseInfo | null;
  onLicenseUpdated: (newLicense: LicenseInfo) => void;
}

export const LicenseManagerModal: React.FC<LicenseManagerModalProps> = ({
  isOpen,
  onClose,
  license,
  onLicenseUpdated
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isHeartbeating, setIsHeartbeating] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LocalLLMStatus | null>(null);
  const [isUnloadingLLM, setIsUnloadingLLM] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLLMInfo();
      setActivationResult(null);
    }
  }, [isOpen]);

  const loadLLMInfo = async () => {
    try {
      const status = await fetchLLMStatus();
      setLlmStatus(status);
    } catch (e) {
      console.warn(e);
    }
  };

  if (!isOpen) return null;

  const currentTier = license?.tier || 'BASIC';
  const tierConfig = LICENSE_TIER_CONFIGS[currentTier];

  const handleCopyHwid = () => {
    if (license?.hwidFormatted) {
      navigator.clipboard.writeText(license.hwidFormatted);
      setCopiedHwid(true);
      setTimeout(() => setCopiedHwid(false), 2500);
    }
  };

  const handleActivate = async (keyToUse?: string) => {
    const key = keyToUse || keyInput;
    if (!key.trim()) return;

    setIsActivating(true);
    setActivationResult(null);

    try {
      const res = await activateLicense(key);
      if (res.success && res.license) {
        onLicenseUpdated(res.license);
        setActivationResult({ success: true, message: res.message });
        setKeyInput('');
      } else {
        setActivationResult({ success: false, message: res.message });
      }
    } catch (e: any) {
      setActivationResult({ success: false, message: e.message || 'Erro inesperado ao ativar licença.' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleHeartbeat = async () => {
    setIsHeartbeating(true);
    try {
      const res = await triggerHeartbeat();
      if (license) {
        const updated: LicenseInfo = {
          ...license,
          daysRemaining: res.daysRemaining,
          syncStatus: 'SYNCED_WITH_SAAS',
          lastSyncDate: new Date().toISOString()
        };
        onLicenseUpdated(updated);
      }
      setActivationResult({ 
        success: true, 
        message: `Sincronização concluída com sucesso! Modo: ${res.mode} (+${res.daysRemaining} dias de validade offline).` 
      });
    } catch (e: any) {
      setActivationResult({ success: false, message: 'Falha ao sincronizar com servidor SaaS.' });
    } finally {
      setIsHeartbeating(false);
    }
  };

  const handleUnloadLLM = async () => {
    setIsUnloadingLLM(true);
    try {
      if (window.electronAPI?.llm?.unload) {
        await window.electronAPI.llm.unload();
      }
      await loadLLMInfo();
      setActivationResult({ success: true, message: 'Memória RAM do modelo LLM liberada com sucesso.' });
    } catch (e: any) {
      //
    } finally {
      setIsUnloadingLLM(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-base">Licenciamento SaaS Local-First</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${tierConfig.badgeColor}`}>
                  {tierConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modelo Seat-Based com Validação Criptográfica Assimétrica Ed25519 Offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Activation Result Notification */}
          {activationResult && (
            <div className={`p-3 rounded-lg border flex items-start space-x-2.5 ${
              activationResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              {activationResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="text-xs">{activationResult.message}</span>
            </div>
          )}

          {/* Section 1: Estação & Hardware ID */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-200 flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-sky-400" />
                <span>Identificador de Hardware (Machine Fingerprint)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                SHA-256 On-Device
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                  Hardware ID da Estação (HWID)
                </label>
                <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-md">
                  <code className="text-amber-400 font-mono text-xs font-semibold select-all truncate">
                    {license?.hwidFormatted || 'HWID-0000-0000-0000-0000'}
                  </code>
                  <button
                    onClick={handleCopyHwid}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                    title="Copiar Hardware ID"
                  >
                    {copiedHwid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Envie este código para vincular a licença à máquina do cartório.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                  Serventia / Cartório Vinculado
                </label>
                <div className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-md flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-200 truncate">
                    {license?.orgName} ({license?.orgId})
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Certificado ICP-Brasil AC Notarial v5 autorizado.
                </p>
              </div>
            </div>

            {/* Licença Atual Info */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Validade Offline</span>
                <span className="text-xs font-bold text-emerald-400">
                  {license?.daysRemaining} dias restantes
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Grace Period</span>
                <span className="text-xs font-bold text-sky-400">
                  30 dias permitidos
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Assinatura Digital</span>
                <span className="text-xs font-bold text-indigo-300">
                  Ed25519 (256-bit)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Ativação de Chave */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <span className="font-semibold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Ativar Chave de Licença Corporativa</span>
            </span>

            <div className="flex space-x-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Ex: ARIA-PRO-2026-X89B-4921 ou token criptográfico JWT"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                onClick={() => handleActivate()}
                disabled={isActivating || !keyInput.trim()}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                {isActivating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>Ativar</span>
              </button>
            </div>

            {/* Chaves de Demonstração / Teste Rápido */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-2">
                Chaves de Demonstração para Avaliação da Banca / Auditoria:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_LICENSE_KEYS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleActivate(item.key)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      currentTier === item.tier
                        ? 'bg-indigo-950/50 border-indigo-500/70 shadow-xs'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-white">
                        {LICENSE_TIER_CONFIGS[item.tier].label}
                      </span>
                      {currentTier === item.tier && (
                        <Check className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    <code className="text-[10px] text-amber-400 font-mono block truncate">
                      {item.key}
                    </code>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {item.seats} postos • {item.tier === 'ENTERPRISE_MTLS' ? 'mTLS + LLM' : item.tier === 'PRO_AI' ? 'LLM On-Device' : 'OPA Básico'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Status da LLM Local Embutida */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Copiloto LLM Local On-Device (node-llama-cpp)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Qwen2.5-1.5B-Instruct-Q4_K_M.gguf
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Estado do Modelo</span>
                <span className="text-[11px] font-bold text-emerald-400">
                  {llmStatus?.isLoaded ? 'Carregado na RAM' : 'Em Espera (Lazy)'}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Contexto Máximo</span>
                <span className="text-[11px] font-bold text-white">2048 tokens</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Auto-Unload</span>
                <span className="text-[11px] font-bold text-amber-400">3 min inativo</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Inferências Realizadas</span>
                <span className="text-[11px] font-bold text-sky-400">{llmStatus?.totalInferences || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-slate-400 max-w-sm">
                O modelo é carregado sob demanda apenas ao clicar em "Sugerir Justificativa" e é descarregado automaticamente da memória após 3 minutos sem chamadas.
              </p>
              <button
                onClick={handleUnloadLLM}
                disabled={isUnloadingLLM}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center space-x-1.5 transition-colors"
                title="Descarregar modelo da memória RAM imediatamente"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Liberar RAM</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isHeartbeating ? 'animate-spin' : ''}`} />
            <span>Última validação: {license?.lastSyncDate ? new Date(license.lastSyncDate).toLocaleTimeString('pt-BR') : 'Hoje'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleHeartbeat}
              disabled={isHeartbeating}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHeartbeating ? 'animate-spin' : ''}`} />
              <span>Sincronizar Heartbeat</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
