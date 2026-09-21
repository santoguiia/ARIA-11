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
  FileCheck,
  Lock,
  ShieldCheck,
  Sun,
  Moon,
  LogOut
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
  onOpenMtlsModal?: () => void;
  onOpenLicenseModal?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout?: () => void;
  hasImpediments?: boolean;
  hasPendingAlerts?: boolean;
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
  onTriggerReevaluate,
  onOpenMtlsModal,
  onOpenLicenseModal,
  isDarkMode = true,
  onToggleDarkMode,
  onLogout,
  hasImpediments = false,
  hasPendingAlerts = false
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
              {onLogout && (
                <>
                  <div className="border-t border-slate-700 my-1"></div>
                  <button
                    onClick={() => {
                      onLogout();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs text-rose-300"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Trocar Escrevente / Bloquear Estação</span>
                  </button>
                </>
              )}
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
              <div className="px-3 py-2 border-b border-slate-700 bg-slate-900/40">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                  Status Atual do Gate
                </span>
                {hasImpediments ? (
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>BLOQUEADO (Impedimentos Legais)</span>
                  </div>
                ) : hasPendingAlerts ? (
                  <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>JUSTIFICATIVA PENDENTE</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CONFORME (Apto para Lavratura)</span>
                  </div>
                )}
              </div>
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

        {/* Menu: Ferramentas (com opção de Modo Claro/Escuro) */}
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
              {/* Opção de Modo Claro / Modo Escuro */}
              {onToggleDarkMode && (
                <button
                  id="menu-ferramentas-toggle-theme"
                  onClick={() => {
                    onToggleDarkMode();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isDarkMode ? 'Escuro' : 'Claro'}
                  </span>
                </button>
              )}
              <div className="border-t border-slate-700 my-1"></div>
              <button
                onClick={() => {
                  onOpenCertificateModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Minuta Oficial do Assento (CNJ 149)</span>
              </button>
              <button
                onClick={() => {
                  onOpenOCRModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <ScanLine className="w-3.5 h-3.5 text-indigo-400" />
                <span>Visualizador de OCR (DO Digitalizada)</span>
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
              {onOpenMtlsModal && (
                <button
                  onClick={() => {
                    onOpenMtlsModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs text-emerald-300"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Barramentos Federados via mTLS (CRC/ONR/SIRC)</span>
                </button>
              )}
              {onOpenLicenseModal && (
                <button
                  onClick={() => {
                    onOpenLicenseModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs text-amber-300"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Licenciamento SaaS Local-First & HWID</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Menu: Licença */}
        {onOpenLicenseModal && (
          <button
            onClick={onOpenLicenseModal}
            className="px-2.5 py-1 rounded hover:bg-slate-700 font-medium text-slate-300 hover:text-white"
          >
            Licença
          </button>
        )}

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
              {onOpenLicenseModal && (
                <button
                  onClick={() => {
                    onOpenLicenseModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Informações da Licença & Machine HWID</span>
                </button>
              )}
              <button
                onClick={() => {
                  onOpenAboutModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Sobre o Sistema ARIA Desktop</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
