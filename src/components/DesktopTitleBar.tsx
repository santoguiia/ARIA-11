import React from 'react';
import { 
  ShieldCheck, 
  Minus, 
  Square, 
  X, 
  Scale, 
  Clock, 
  UserCheck, 
  Building2,
  Cpu
} from 'lucide-react';

interface DesktopTitleBarProps {
  currentScenarioTitle?: string;
  hasImpediments: boolean;
  hasPendingAlerts: boolean;
  onOpenAudit: () => void;
  onOpenPackager: () => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  currentScenarioTitle,
  hasImpediments,
  hasPendingAlerts,
  onOpenAudit,
  onOpenPackager
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

  return (
    <header className="bg-slate-900 border-b border-slate-700 text-slate-200 select-none text-xs flex items-center justify-between px-3 py-1.5 z-40">
      {/* Left: Window Identity & Logo */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wide text-white">ARIA Desktop</span>
          <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1 rounded border border-indigo-700 font-mono">v1.4.2 [REF-11 / INE5448]</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span>•</span>
          <span className="truncate max-w-[280px] font-medium text-slate-300">
            {currentScenarioTitle || 'Assistente de Pré-Lavratura & Quality Gate'}
          </span>
        </div>
      </div>

      {/* Middle: Cartório & Station Context */}
      <div className="hidden lg:flex items-center space-x-4 text-slate-400 text-[11px]">
        <div className="flex items-center space-x-1.5">
          <Building2 className="w-3 h-3 text-slate-400" />
          <span className="text-slate-300">1º Ofício de Registro Civil - Cartório Central</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <UserCheck className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-300">Escrevente: <strong>G. Santos (Mat. 8419)</strong></span>
        </div>
        <div className="flex items-center space-x-1.5 font-mono text-slate-400">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{time}</span>
        </div>
      </div>

      {/* Right: Quality Gate Status Pill & Windows Buttons */}
      <div className="flex items-center space-x-3">
        {/* Quality gate quick status */}
        <div className="flex items-center space-x-1.5">
          {hasImpediments ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
              GATE: BLOQUEADO
            </span>
          ) : hasPendingAlerts ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
              GATE: JUSTIFICATIVA PENDENTE
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
              GATE: CONFORME
            </span>
          )}
        </div>

        <button
          onClick={onOpenPackager}
          title="Empacotamento Windows (.EXE Standalone)"
          className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded text-[10px] transition-colors"
        >
          <Cpu className="w-3 h-3" />
          <span>Windows .EXE</span>
        </button>

        {/* Windows Standard Window Chrome Buttons */}
        <div className="flex items-center -mr-1">
          <button 
            type="button"
            className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Minimizar (Janela Windows)"
            onClick={() => {}}
          >
            <Minus className="w-3 h-3" />
          </button>
          <button 
            type="button"
            className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Maximizar / Restaurar"
            onClick={() => {}}
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button 
            type="button"
            className="w-8 h-6 flex items-center justify-center hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
            title="Fechar Janela"
            onClick={() => {
              if (confirm('Deseja salvar a sessão de auditoria e fechar o aplicativo ARIA?')) {
                onOpenAudit();
              }
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
