import React, { useState } from 'react';
import { 
  X, 
  History, 
  Download, 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check, 
  Hash, 
  Clock, 
  UserCheck, 
  Search,
  Filter
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onExportJSON: () => void;
  onExportTXT: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  logs,
  onExportJSON,
  onExportTXT
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredLogs = logs.filter(l => 
    l.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.sha256Hash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Trilha de Auditoria & Imutabilidade Criptográfica</span>
                <span className="text-[10px] bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-slate-600">
                  SHA-256 Ledger
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Registro encadeado de pré-lavratura cartorária em conformidade com o Provimento CNJ nº 149/2023.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onExportJSON}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs border border-slate-600 transition-colors"
              title="Exportar registros em formato JSON compatível com SQLite"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={onExportTXT}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs border border-slate-600 transition-colors"
              title="Exportar laudo técnico para arquivo texto (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Laudo TXT</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Buscar por operador, hash ou termo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="text-slate-400 text-[11px]">
            Total de eventos encadeados: <strong className="text-cyan-400">{logs.length}</strong>
          </div>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nenhum registro de auditoria corresponde ao filtro.
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs hover:border-slate-700 transition-colors"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      entry.action === 'LAVRATURA_APROVADA'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : entry.action === 'LAVRATURA_BLOQUEADA'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : entry.action === 'JUSTIFICATION_SUBMITTED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {entry.action}
                    </span>
                    <span className="font-semibold text-slate-200">{entry.resumo}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{entry.timestamp}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-300">
                      <UserCheck className="w-3 h-3 text-cyan-400" />
                      <span>{entry.operador}</span>
                    </span>
                  </div>
                </div>

                {/* Justifications if any */}
                {entry.justifications && Object.keys(entry.justifications).length > 0 && (
                  <div className="mt-2 p-2 bg-amber-950/20 border border-amber-900/40 rounded text-[11px] text-amber-200">
                    <div className="font-bold text-[10px] uppercase text-amber-400 mb-1">
                      Motivações Jurídicas Registradas pelo Operador:
                    </div>
                    {Object.entries(entry.justifications).map(([ruleId, text]) => (
                      <div key={ruleId} className="space-y-0.5">
                        <span className="font-mono text-amber-300 font-semibold">{ruleId}: </span>
                        <span className="italic">"{text}"</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Snapshot data */}
                {entry.snapshotData && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-4 bg-slate-900/60 px-2 py-1 rounded">
                    <span>Falecido: <strong className="text-slate-200">{entry.snapshotData.nomeFalecido}</strong></span>
                    <span>CPF: <strong className="font-mono text-slate-200">{entry.snapshotData.cpf}</strong></span>
                    <span>DO: <strong className="font-mono text-slate-200">{entry.snapshotData.numeroDO}</strong></span>
                  </div>
                )}

                {/* Crypto hashes */}
                <div className="mt-2.5 pt-2 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-slate-500">Hash Bloco:</span>
                    <span className="text-cyan-400 truncate">{entry.sha256Hash}</span>
                    <button
                      onClick={() => copyToClipboard(entry.sha256Hash)}
                      className="text-slate-500 hover:text-cyan-300 p-0.5"
                      title="Copiar Hash SHA-256"
                    >
                      {copiedHash === entry.sha256Hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-slate-500">Hash Anterior:</span>
                    <span className="text-slate-400 truncate">{entry.previousHash}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encadeamento Criptográfico Local Ativo (Impedimento de Adulteração)</span>
          </div>
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
