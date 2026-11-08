import React from 'react';
import { 
  Scale, 
  Clock, 
  Building2, 
  LogOut, 
  FilePlus2,
  CheckCircle2
} from 'lucide-react';
import { EscreventeUser } from '../types';

interface DesktopTitleBarProps {
  onNewCleanLavratura?: () => void;
  currentUser?: EscreventeUser | null;
  onLogout?: () => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  onNewCleanLavratura,
  currentUser,
  onLogout
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
      {/* Left: Window Identity & Logo & New Lavratura Button */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wide text-white">ARIA Desktop</span>
        </div>

        {/* Quick Action: Nova Lavratura em Branco */}
        {onNewCleanLavratura && (
          <button
            type="button"
            id="btn-titlebar-new-lavratura"
            onClick={onNewCleanLavratura}
            className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-all hover:scale-102 cursor-pointer"
            title="Iniciar Nova Lavratura com formulários 100% limpos em branco (Ctrl+N)"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nova Lavratura Limpa</span>
          </button>
        )}

        <div className="hidden md:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span>•</span>
          <span className="flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Modo Produção: Oficial</span>
          </span>
        </div>
      </div>

      {/* Middle: Cartório & Station Context */}
      <div className="hidden lg:flex items-center space-x-4 text-slate-400 text-[11px]">
        <div className="flex items-center space-x-1.5">
          <Building2 className="w-3 h-3 text-slate-400" />
          <span className="text-slate-300 truncate max-w-[240px]" title={currentUser?.cartorio || '1º Ofício de RCPN'}>
            {currentUser?.cartorio || '1º Ofício de RCPN'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
            {currentUser?.avatarInitials || 'GS'}
          </div>
          <span className="text-slate-200">
            <strong className="text-white">{currentUser?.nome || 'Operador'}</strong>
            <span className="text-slate-400 text-[10px] ml-1">({currentUser?.matricula || 'ESC-8419'})</span>
          </span>
          {onLogout && (
            <button
              id="btn-titlebar-logout"
              onClick={onLogout}
              className="ml-1.5 text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-slate-700 cursor-pointer"
              title="Encerrar Sessão / Expurgo de Memória (LGPD)"
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
