import React from 'react';
import { X, Scan, AlertTriangle, CheckCircle2, FileText, Layers, ZoomIn } from 'lucide-react';
import { DeathRecordData, OCRConfidenceMap } from '../types';

interface OCRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrData: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
}

export const OCRPreviewModal: React.FC<OCRPreviewModalProps> = ({
  isOpen,
  onClose,
  ocrData,
  ocrConfidence
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Simulador de OCR - Declaração de Óbito Física (DO - Via Amarela)</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-700">
                  Ministério da Saúde / SVS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualização do documento digitalizado com bounding boxes e métricas de fidelidade óptica.
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

        {/* Document Facsimile Container */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-950 flex justify-center">
          {/* Yellow form paper facsimile */}
          <div className="w-full max-w-2xl bg-amber-100/90 text-slate-900 border-2 border-amber-300 rounded-lg p-6 shadow-xl font-mono text-xs relative select-none">
            
            {/* Stamp / Official Header */}
            <div className="border-b-2 border-slate-800 pb-3 mb-4 text-center">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
                REPÚBLICA FEDERATIVA DO BRASIL • MINISTÉRIO DA SAÚDE
              </div>
              <div className="font-extrabold text-sm uppercase tracking-wider text-slate-950">
                DECLARAÇÃO DE ÓBITO (VIA AMARELA - CARTÓRIO)
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1 font-bold">
                <span>SISTEMA DE INFORMAÇÕES SOBRE MORTALIDADE (SIM)</span>
                <span className="bg-amber-200 border border-amber-400 px-2 py-0.5 rounded text-red-700 font-extrabold text-xs">
                  Nº {ocrData.numeroDO}
                </span>
              </div>
            </div>

            {/* OCR Bounding Boxes Simulation */}
            <div className="space-y-3">
              
              {/* Box: Falecido */}
              <div className="border border-dashed border-amber-600/80 bg-amber-50/80 p-2.5 rounded relative">
                <div className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold">
                  OCR: {ocrConfidence.nomeFalecido}%
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">1. Identificação do Falecido:</div>
                <div className="text-xs font-bold text-slate-950 uppercase">{ocrData.nomeFalecido}</div>
                <div className="grid grid-cols-3 gap-2 mt-1 text-[11px]">
                  <div>CPF: <span className="font-bold">{ocrData.cpf}</span></div>
                  <div>RG: <span>{ocrData.rg} ({ocrData.rgOrgaoEmissor})</span></div>
                  <div>Sexo: <span>{ocrData.sexo}</span> | Raça: <span>{ocrData.corRaca}</span></div>
                </div>
              </div>

              {/* Box: Cronologia */}
              <div className="border border-dashed border-amber-600/80 bg-amber-50/80 p-2.5 rounded relative">
                <div className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold">
                  OCR: {ocrConfidence.dataObito}%
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">2. Nascimento & Falecimento:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] mt-0.5">
                  <div>Data Nascimento: <span className="font-bold">{ocrData.dataNascimento}</span></div>
                  <div>Data do Óbito: <span className="font-bold text-red-800">{ocrData.dataObito}</span> às <span>{ocrData.horaObito}</span></div>
                </div>
                <div className="text-[11px] mt-1">
                  Local do Óbito: <span className="font-medium">{ocrData.localObito} ({ocrData.municipioObito}/{ocrData.ufObito})</span>
                </div>
              </div>

              {/* Box: Filiação */}
              <div className="border border-dashed border-amber-600/80 bg-amber-50/80 p-2.5 rounded relative">
                <div className={`absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  (ocrConfidence.nomeMae || 90) < 75 ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
                }`}>
                  OCR: {ocrConfidence.nomeMae}%
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">3. Filiação (Pai e Mãe):</div>
                <div className="text-[11px] space-y-0.5 mt-0.5">
                  <div>Mãe: <span className="font-bold uppercase text-slate-950">{ocrData.nomeMae}</span></div>
                  <div>Pai: <span className="font-medium uppercase text-slate-900">{ocrData.nomePai}</span></div>
                </div>
              </div>

              {/* Box: Causa Mortis */}
              <div className="border border-dashed border-amber-600/80 bg-amber-50/80 p-2.5 rounded relative">
                <div className={`absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  (ocrConfidence.causaMortis || 90) < 75 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  OCR: {ocrConfidence.causaMortis}%
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">4. Causa da Morte (Parte I e II):</div>
                <div className="text-xs font-semibold text-slate-950 italic mt-0.5">
                  "{ocrData.causaMortis}"
                </div>
                <div className="text-[11px] text-slate-700 mt-1 flex justify-between">
                  <span>CID-10: <strong>{ocrData.cid10}</strong></span>
                  <span>Médico: <strong>{ocrData.nomeMedico}</strong> (CRM {ocrData.crmMedico}/{ocrData.ufCrm})</span>
                </div>
              </div>

              {/* Box: Sepultamento & Declarante */}
              <div className="border border-dashed border-amber-600/80 bg-amber-50/80 p-2.5 rounded relative text-[11px]">
                <div className="text-[10px] text-slate-600 font-bold uppercase">5. Sepultamento & Declarante:</div>
                <div className="mt-0.5">
                  Sepultamento em: <span className="font-medium">{ocrData.cemiterio}</span>
                </div>
                <div className="mt-0.5">
                  Declarante no Cartório: <span className="font-bold">{ocrData.nomeDeclarante}</span> ({ocrData.qualificacaoDeclarante})
                </div>
              </div>

            </div>

            {/* Document Footer */}
            <div className="mt-6 pt-3 border-t border-slate-700 text-[10px] text-slate-600 flex justify-between items-center">
              <span>Carimbo Oficial do Estabelecimento de Saúde</span>
              <span className="italic font-sans text-slate-500">Documento processado por OCR Pipeline v2.4</span>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div>
            Campos com OCR &lt; 80% requerem conferência manual obrigatória antes da assinatura do assento.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
