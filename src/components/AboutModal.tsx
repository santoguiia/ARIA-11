import React from 'react';
import { X, Scale, BookOpen, ShieldCheck, CheckCircle2, Award, Cpu } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito
              </h2>
              <p className="text-xs text-slate-400">
                Projeto Acadêmico REF-11 / Disciplina INE5448 (Engenharia de Software / LegalTech)
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
        <div className="p-5 space-y-3.5 text-xs text-slate-300 leading-relaxed max-h-[75vh] overflow-y-auto">
          
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-cyan-400 text-xs">Objetivo da Prova de Conceito (PoC):</div>
            <p>
              Prevenir fraudes, homônimos e erros de cronologia vital na lavratura de registros de óbito nos cartórios de Registro Civil das Pessoas Naturais (RCPN), empregando um <strong>motor determinístico de Quality Gate</strong> (estilo Open Policy Agent / Rego) que valida dados multifonte antes da emissão definitiva da certidão.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-white text-xs flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Pilares de Arquitetura da Solução:</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300 pl-1">
              <li>
                <strong>CrossCheck Multifonte:</strong> Confronto em tempo real entre a Declaração preliminar (manual), OCR da DO física e Base Federada Centralizada (CRC Nacional e Receita Federal).
              </li>
              <li>
                <strong>Validação Determinística Zero-Alucinação:</strong> Regras de integridade matemática (Módulo 11 do CPF), cronologia vital estrita (nascimento &lt; casamento &lt; óbito) e conferência de filiação.
              </li>
              <li>
                <strong>Matriz de Severidade Registral:</strong> <code>BLOQUEIO_IMPEDIENTE</code> trava o ato; <code>ALERTA_OBRIGATORIO</code> exige justificativa jurídica salva em log; <code>INFORMATIVO</code> auxilia na rotina cartorária.
              </li>
              <li>
                <strong>Trilha Criptográfica Imutável:</strong> Encadeamento de eventos com hash SHA-256 local para auditoria e prestação de contas aos órgãos correcionais (CNJ).
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/60 p-3 rounded border border-slate-700 text-[11px] space-y-1 text-slate-400">
            <div className="font-bold text-slate-200">Embasamento Jurídico e Normativo:</div>
            <div>• Lei Federal nº 6.015/1973 (Lei de Registros Públicos - Arts. 77 a 88)</div>
            <div>• Provimento CNJ nº 149/2023 (Código Nacional de Normas da Corregedoria)</div>
            <div>• Resoluções CFM nº 2.384/2024 e Manuais de Instruções da SVS / Ministério da Saúde</div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
