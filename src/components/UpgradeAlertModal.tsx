import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  KeyRound, 
  Check, 
  Lock, 
  X,
  ArrowRight,
  Cpu,
  Network
} from 'lucide-react';
import { LicenseInfo, LicenseTier } from '../types';
import { LICENSE_TIER_CONFIGS } from '../engine/licenseEngine';

interface UpgradeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier: LicenseTier;
  currentLicense: LicenseInfo | null;
  onOpenLicenseManager: () => void;
  onQuickUpgrade?: (tier: LicenseTier) => void;
}

export const UpgradeAlertModal: React.FC<UpgradeAlertModalProps> = ({
  isOpen,
  onClose,
  requiredTier,
  currentLicense,
  onOpenLicenseManager,
  onQuickUpgrade
}) => {
  if (!isOpen) return null;

  const reqConfig = LICENSE_TIER_CONFIGS[requiredTier];
  const curTier = currentLicense?.tier || 'BASIC';
  const curConfig = LICENSE_TIER_CONFIGS[curTier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Controle de Acesso por Nível de Licença</h3>
              <p className="text-[11px] text-slate-400">Esta funcionalidade requer o plano {reqConfig.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/80">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                Plano Atual da Estação
              </span>
              <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                <span>{curConfig.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {curConfig.description}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/50 shadow-xs">
              <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider flex items-center space-x-1 mb-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Nível Exigido</span>
              </span>
              <div className="font-bold text-indigo-200 text-sm flex items-center space-x-1.5">
                <span>{reqConfig.label}</span>
              </div>
              <p className="text-[11px] text-indigo-300/80 mt-1 leading-snug">
                {reqConfig.description}
              </p>
            </div>
          </div>

          {/* Feature specifics */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <h4 className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider">
              Benefícios do Plano {reqConfig.label}:
            </h4>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              {requiredTier === 'PRO_AI' && (
                <>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Copiloto LLM Local Qwen2.5 (1.5B):</strong> Redação automática de motivações para alertas do Quality Gate (Lei 6.015/73).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Minuta Automatizada de Assento:</strong> Geração instantânea do texto oficial do assento de óbito.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Conformidade LGPD Total:</strong> Processamento 100% on-device na RAM da estação sem enviar dados para a nuvem.</span>
                  </li>
                </>
              )}
              {requiredTier === 'ENTERPRISE_MTLS' && (
                <>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Túneis mTLS ICP-Brasil:</strong> Conexão criptográfica direta com CRC Nacional, ONR, SIRC/SISOBI e Receita Federal.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Todas as Capacidades Pro AI:</strong> Copiloto LLM Local Qwen2.5 ilimitado em todas as estações do cartório.</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {onQuickUpgrade ? (
            <button
              onClick={() => {
                onQuickUpgrade(requiredTier);
                onClose();
              }}
              className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Ativar licença de teste para demonstração imediata"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ativar {reqConfig.label} (Demo)</span>
            </button>
          ) : <div />}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenLicenseManager();
              }}
              className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Inserir Chave Corporativa</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
