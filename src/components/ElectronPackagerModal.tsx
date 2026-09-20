import React, { useState } from 'react';
import { X, Cpu, Copy, Check, Terminal, FileCode, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ElectronPackagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElectronPackagerModal: React.FC<ElectronPackagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const packageJsonScript = `"scripts": {
  "electron:dev": "concurrently \\"npm run dev\\" \\"wait-on http://localhost:3000 && electron electron/main.cjs\\"",
  "electron:build": "npm run build && electron-builder --win"
}`;

  const buildCommand = `npm install -D electron electron-builder concurrently wait-on
npm run electron:build`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-pink-950 text-pink-400 border border-pink-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Compilação do Executável Windows (.EXE Standalone)</span>
                <span className="text-[10px] bg-pink-950 text-pink-300 px-1.5 py-0.5 rounded font-mono border border-pink-700">
                  x64 NSIS / Portable
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Arquitetura Electron + Vite + React + Motor Declarativo OPA/Rego preparado para Windows 10/11.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Arquivos de Configuração Electron Já Criados no Projeto</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              O projeto já conta com <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">electron/main.cjs</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">electron/preload.cjs</code> e o arquivo de build <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">electron-builder.json</code> devidamente estruturados na raiz.
            </p>
          </div>

          {/* Step 1: Commands */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Comando para Gerar o .EXE no Windows (Prompt / PowerShell):</span>
              </span>
              <button
                onClick={() => copyCode(buildCommand, 'cmd')}
                className="text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                {copiedSection === 'cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">Copiar</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              {buildCommand}
            </pre>
          </div>

          {/* Step 2: Scripts configuration in package.json */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Scripts no <code>package.json</code>:</span>
              </span>
              <button
                onClick={() => copyCode(packageJsonScript, 'scripts')}
                className="text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                {copiedSection === 'scripts' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">Copiar</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
              {packageJsonScript}
            </pre>
          </div>

          {/* Output information */}
          <div className="bg-slate-800/60 p-3 rounded border border-slate-700 text-[11px] text-slate-300 space-y-1">
            <div className="font-bold text-white">Artefato de Saída Gerado:</div>
            <div>
              • Executável Instalador: <span className="font-mono text-cyan-300">release/ARIA Quality Gate Setup 1.4.2.exe</span>
            </div>
            <div>
              • Executável Portátil (sem instalação): <span className="font-mono text-cyan-300">release/ARIA Quality Gate 1.4.2.exe</span>
            </div>
            <div className="text-slate-400 text-[10px] mt-1">
              * Inclui persistência local autônoma (JSON / SQLite) sem dependência externa de servidores na nuvem.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
