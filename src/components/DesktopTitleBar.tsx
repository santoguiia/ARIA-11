import React from 'react';
import { 
  Scale, 
  Clock, 
  Building2,
  LogOut,
  KeyRound,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { EscreventeUser, LicenseInfo } from '../types';
import { LICENSE_TIER_CONFIGS } from '../engine/licenseEngine';

interface DesktopTitleBarProps {
  currentScenarioTitle?: string;
  hasImpediments?: boolean;
  hasPendingAlerts?: boolean;
  onOpenAudit?: () => void;
  onOpenPackager?: () => void;
  onOpenMtls?: () => void;
  currentUser?: EscreventeUser | null;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  license?: LicenseInfo | null;
  onOpenLicense?: () => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  currentScenarioTitle,
  onOpenAudit,
  currentUser,
  onLogout,
  license,
  onOpenLicense
}) => {
  const [time, setTime] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const curTier = license?.tier || 'PRO_AI';
  const tierConfig = LICENSE_TIER_CONFIGS[curTier];

  return (
    <header className="bg-slate-900 border-b border-slate-700 text-slate-200 select-none text-xs flex items-center justify-between px-3 py-1.5 z-40">
      {/* Left: Window Identity & Logo */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wide text-white">ARIA Desktop</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span>•</span>
          <span className="truncate max-w-[240px] font-medium text-slate-300">
            {currentScenarioTitle || 'Assistente de Pré-Lavratura & Quality Gate'}
          </span>
        </div>
      </div>

      {/* Middle: Cartório & Station Context */}
      <div className="hidden lg:flex items-center space-x-4 text-slate-400 text-[11px]">
        <div className="flex items-center space-x-1.5">
          <Building2 className="w-3 h-3 text-slate-400" />
          <span className="text-slate-300 truncate max-w-[200px]" title={currentUser?.cartorio || '1º Ofício de RCPN'}>
            {currentUser?.cartorio || '1º Ofício de RCPN'}
          </span>
        </div>

        {/* License Pill */}
        {license && onOpenLicense && (
          <button
            onClick={onOpenLicense}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[10px] font-medium transition-all hover:brightness-110 ${tierConfig.badgeColor}`}
            title={`Licença ${tierConfig.label} (${license.daysRemaining} dias restantes offline). Clique para gerenciar.`}
          >
            {curTier === 'PRO_AI' ? (
              <Sparkles className="w-3 h-3 text-amber-400" />
            ) : curTier === 'ENTERPRISE_MTLS' ? (
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
            ) : (
              <KeyRound className="w-3 h-3 text-slate-400" />
            )}
            <span className="font-bold">{tierConfig.label}</span>
            <span className="opacity-80">({license.daysRemaining}d offline)</span>
          </button>
        )}

        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
            {currentUser?.avatarInitials || 'GS'}
          </div>
          <span className="text-slate-200">
            <strong className="text-white">{currentUser?.nome || 'Guilherme Santos'}</strong>
            <span className="text-slate-400 text-[10px] ml-1">({currentUser?.matricula || 'ESC-8419'})</span>
          </span>
          {onLogout && (
            <button
              id="btn-titlebar-logout"
              onClick={onLogout}
              className="ml-1.5 text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-slate-700"
              title="Bloquear Estação / Trocar Escrevente"
            >
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Clock */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 font-mono text-slate-400">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
};
