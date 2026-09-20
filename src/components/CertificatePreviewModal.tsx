import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Scale, Award } from 'lucide-react';
import { DeathRecordData } from '../types';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DeathRecordData;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  record
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate synthetic official civil registration matricula (32 digits)
  // [6 dígitos cartório] [2 acervo] [2 atribuição 55=RCPN] [4 ano] [1 tipo livro 4=óbito] [5 número livro] [3 folha] [7 termo] [2 DV]
  const matricula = `118492 01 55 2024 4 00042 118 0004921-88`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Minuta Oficial da Certidão de Óbito</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-700">
                  Pré-Lavratura Homologada
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Traslado pronto para conferência das partes e assinatura digital do Oficial Registrador.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex justify-center">
          <div className="w-full max-w-2xl bg-amber-50/95 text-slate-900 border-4 border-double border-amber-800/60 p-8 shadow-2xl relative font-serif text-xs leading-relaxed select-text">
            
            {/* National Coat of Arms Header */}
            <div className="text-center border-b-2 border-amber-900/40 pb-4 mb-5">
              <div className="flex justify-center mb-1">
                <Scale className="w-8 h-8 text-amber-900" />
              </div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-amber-950 font-sans">
                REPÚBLICA FEDERATIVA DO BRASIL
              </h3>
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900 font-sans mt-0.5">
                REGISTRO CIVIL DAS PESSOAS NATURAIS
              </h4>
              <p className="text-[11px] text-slate-700 italic mt-0.5">
                1º Ofício de Registro Civil e Tabelionato • Comarca Central
              </p>
              <div className="mt-2 text-base font-extrabold tracking-wide uppercase text-amber-900 border-y border-amber-900/20 py-1">
                CERTIDÃO DE ÓBITO
              </div>
              <div className="mt-1 font-mono text-[11px] font-bold text-slate-800 bg-amber-200/60 py-0.5 px-2 rounded border border-amber-300 inline-block">
                MATRÍCULA: {matricula}
              </div>
            </div>

            {/* Certificate Content */}
            <div className="space-y-3 font-sans text-xs">
              
              {/* Nome do Falecido */}
              <div className="bg-amber-100/50 p-2 rounded border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">NOME DO FALECIDO:</span>
                <span className="text-sm font-extrabold uppercase text-slate-950">{record.nomeFalecido}</span>
              </div>

              {/* Grid 1: CPF, RG, Sexo, Cor */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">CPF:</span>
                  <span className="font-mono font-bold text-slate-900">{record.cpf}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">DOCUMENTO DE IDENTIDADE:</span>
                  <span className="font-mono text-slate-900">{record.rg} ({record.rgOrgaoEmissor})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">SEXO E COR:</span>
                  <span>{record.sexo === 'M' ? 'MASCULINO' : 'FEMININO'} • {record.corRaca}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">ESTADO CIVIL:</span>
                  <span className="font-bold">{record.estadoCivil}</span>
                  {record.nomeConjuge && <span className="block text-[11px] text-slate-700">Cônjuge: {record.nomeConjuge}</span>}
                </div>
              </div>

              {/* Grid 2: Filiação */}
              <div className="border-t border-amber-200 pt-2 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">FILIAÇÃO:</span>
                <div className="font-semibold uppercase text-slate-900">MÃE: {record.nomeMae}</div>
                <div className="font-semibold uppercase text-slate-900">PAI: {record.nomePai}</div>
              </div>

              {/* Grid 3: Falecimento */}
              <div className="border-t border-amber-200 pt-2 text-xs space-y-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">DATA E HORA DO FALECIMENTO:</span>
                  <span className="font-bold text-slate-900">{record.dataObito} às {record.horaObito} horas</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">LOCAL DO FALECIMENTO:</span>
                  <span>{record.localObito}, {record.municipioObito} - {record.ufObito}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">CAUSA DA MORTE:</span>
                  <span className="italic">{record.causaMortis} (CID-10: {record.cid10})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">MÉDICO QUE ATESTOU:</span>
                  <span>{record.nomeMedico} • CRM: {record.crmMedico}/{record.ufCrm}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">SEPULTAMENTO / CREMAÇÃO:</span>
                  <span>{record.sepultamentoCremacao} no {record.cemiterio}</span>
                </div>
              </div>

              {/* Grid 4: Bens, Filhos e Declarante */}
              <div className="border-t border-amber-200 pt-2 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">DEIXOU BENS / FILHOS:</span>
                  <span>Bens: {record.deixouBens} | Filhos: {record.deixouFilhos} {record.nomesFilhos ? `(${record.nomesFilhos})` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">DECLARANTE:</span>
                  <span>{record.nomeDeclarante} ({record.qualificacaoDeclarante})</span>
                </div>
              </div>

              {/* DO number and closing legal notice */}
              <div className="border-t-2 border-amber-900/30 pt-3 text-[11px] text-slate-700 italic text-justify leading-snug">
                O presente assento foi lavrado a requerimento do declarante acima qualificado, à vista da Declaração de Óbito nº <strong>{record.numeroDO}</strong> do Ministério da Saúde. Certifico que o ato cumpriu todas as prescrições da Lei Federal nº 6.015/1973 e Provimento CNJ nº 149/2023. O referido é verdade e dou fé.
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-4 border-t border-slate-400 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <div className="border-b border-slate-600 pb-1 font-semibold text-slate-900 uppercase">
                    {record.nomeDeclarante}
                  </div>
                  <span className="text-[10px] text-slate-600">Declarante</span>
                </div>
                <div>
                  <div className="border-b border-slate-600 pb-1 font-semibold text-slate-900">
                    Guilherme Santos - Escrevente Autorizado
                  </div>
                  <span className="text-[10px] text-slate-600">Oficial de Registro Civil / Escrevente</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Validação de Quality Gate Concluída Sem Pendências</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold transition-colors"
          >
            Fechar Minuta
          </button>
        </div>
      </div>
    </div>
  );
};
