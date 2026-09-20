import React, { useState } from 'react';
import { 
  FileText, 
  Layers, 
  ShieldAlert, 
  Settings, 
  HelpCircle, 
  Download, 
  ScanLine, 
  History, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileCheck
} from 'lucide-react';
import { MOCK_SCENARIOS } from '../data/mockScenarios';
import { CaseScenario } from '../types';

interface DesktopMenuBarProps {
  currentScenario: CaseScenario;
  onSelectScenario: (scen: CaseScenario) => void;
  onOpenAudit: () => void;
  onOpenOCRModal: () => void;
  onOpenCertificateModal: () => void;
  onOpenPackagerModal: () => void;
  onOpenAboutModal: () => void;
  onExportAuditJSON: () => void;
  onExportReportTXT: () => void;
  onResetToDefaults: () => void;
  onTriggerReevaluate: () => void;
}

export const DesktopMenuBar: React.FC<DesktopMenuBarProps> = ({
  currentScenario,
  onSelectScenario,
  onOpenAudit,
  onOpenOCRModal,
  onOpenCertificateModal,
  onOpenPackagerModal,
  onOpenAboutModal,
  onExportAuditJSON,
  onExportReportTXT,
  onResetToDefaults,
  onTriggerReevaluate
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  // Close menus on outside click
  React.useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-3 py-1 text-slate-200 text-xs flex items-center justify-between relative z-30 select-none">
      {/* Menu items */}
      <div className="flex items-center space-x-1 menu-container">
        {/* Menu: Arquivo */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('arquivo')}
            className={`px-2.5 py-1 rounded hover:bg-slate-700 font-medium ${
              openMenu === 'arquivo' ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
          >
            Arquivo
          </button>
          {openMenu === 'arquivo' && (
            <div className="absolute left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200">
              <button
                onClick={() => {
                  onResetToDefaults();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center justify-between text-xs"
              >
                <span>Novo Ato de Óbito (Reiniciar)</span>
                <span className="text-[10px] text-slate-400">Ctrl+N</span>
              </button>
              <div className="border-t border-slate-700 my-1"></div>
              <button
                onClick={() => {
                  onExportAuditJSON();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Exportar Trilha de Auditoria (.json)</span>
              </button>
              <button
                onClick={() => {
                  onExportReportTXT();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Laudo Técnico (.txt)</span>
              </button>
              <div className="border-t border-slate-700 my-1"></div>
              <button
                onClick={() => {
                  onOpenCertificateModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Visualizar Minuta da Certidão</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu: Casos PoC (REF-11 / INE5448) */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('casos')}
            className={`px-2.5 py-1 rounded hover:bg-slate-700 font-medium flex items-center space-x-1 ${
              openMenu === 'casos' ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400 mr-1" />
            <span>Casos de Teste PoC</span>
          </button>
          {openMenu === 'casos' && (
            <div className="absolute left-0 mt-1 w-80 bg-slate-800 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Cenários do Projeto Acadêmico (INE5448)
              </div>
              {MOCK_SCENARIOS.map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => {
                    onSelectScenario(scen);
                    setOpenMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-700 flex items-start space-x-2.5 transition-colors ${
                    currentScenario.id === scen.id ? 'bg-slate-700/80 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  {scen.tag === 'CRITICO' && <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                  {scen.tag === 'ALERTA' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                  {scen.tag === 'CONFORME' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
                  <div>
                    <div className="font-semibold text-xs text-white">{scen.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{scen.shortDesc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu: Quality Gate */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('qg')}
            className={`px-2.5 py-1 rounded hover:bg-slate-700 font-medium ${
              openMenu === 'qg' ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
          >
            Quality Gate
          </button>
          {openMenu === 'qg' && (
            <div className="absolute left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200">
              <button
                onClick={() => {
                  onTriggerReevaluate();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center justify-between text-xs"
              >
                <span>Reavaliar Regras OPA/Rego</span>
                <span className="text-[10px] text-slate-400">F5</span>
              </button>
              <button
                onClick={() => {
                  onOpenAudit();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Trilha de Auditoria & Justificativas</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu: Ferramentas */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('ferramentas')}
            className={`px-2.5 py-1 rounded hover:bg-slate-700 font-medium ${
              openMenu === 'ferramentas' ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
          >
            Ferramentas
          </button>
          {openMenu === 'ferramentas' && (
            <div className="absolute left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200">
              <button
                onClick={() => {
                  onOpenOCRModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <ScanLine className="w-3.5 h-3.5 text-indigo-400" />
                <span>Visualizador de OCR (DO Física)</span>
              </button>
              <button
                onClick={() => {
                  onOpenAudit();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Logs de Auditoria Criptográfica SHA-256</span>
              </button>
              <div className="border-t border-slate-700 my-1"></div>
              <button
                onClick={() => {
                  onOpenPackagerModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <Cpu className="w-3.5 h-3.5 text-pink-400" />
                <span>Configurar Standalone Windows (.EXE)</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu: Ajuda */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('ajuda')}
            className={`px-2.5 py-1 rounded hover:bg-slate-700 font-medium ${
              openMenu === 'ajuda' ? 'bg-slate-700 text-white' : 'text-slate-300'
            }`}
          >
            Ajuda
          </button>
          {openMenu === 'ajuda' && (
            <div className="absolute left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-slate-200">
              <button
                onClick={() => {
                  onOpenAboutModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Sobre o Projeto REF-11 / INE5448</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Shortcuts Toolbar on right */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenOCRModal}
          className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-slate-700/80 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-colors"
          title="Ver Guia Física Digitalizada (OCR)"
        >
          <ScanLine className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Ver DO Física</span>
        </button>

        <button
          onClick={onOpenAudit}
          className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-slate-700/80 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition-colors"
          title="Abrir Trilha de Auditoria"
        >
          <History className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">Auditoria</span>
        </button>

        <button
          onClick={onOpenCertificateModal}
          className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700 rounded text-indigo-200 hover:text-white transition-colors"
          title="Minuta do Assento de Óbito"
        >
          <FileCheck className="w-3 h-3 text-indigo-300" />
          <span className="hidden sm:inline">Minuta do Assento</span>
        </button>
      </div>
    </nav>
  );
};
