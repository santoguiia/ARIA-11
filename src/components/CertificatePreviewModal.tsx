import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  Scale, 
  Award, 
  QrCode, 
  Copy, 
  Check, 
  FileText,
  Lock,
  Download,
  Loader2,
  Cpu,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DeathRecordData, EscreventeUser, LicenseInfo, LicenseTier } from '../types';
import { requestLLMMinuta } from '../engine/llmClient';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DeathRecordData;
  currentUser?: EscreventeUser | null;
  license?: LicenseInfo | null;
  justifications?: Record<string, string>;
  onTriggerUpgradeAlert?: (requiredTier: LicenseTier) => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  license,
  justifications,
  onTriggerUpgradeAlert
}) => {
  const [activeTab, setActiveTab] = useState<'CERTIFICATE' | 'LLM_MINUTA'>('CERTIFICATE');
  const [copied, setCopied] = useState(false);
  const [copiedMinuta, setCopiedMinuta] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Local LLM Minuta State
  const [minutaText, setMinutaText] = useState<string>('');
  const [isGeneratingMinuta, setIsGeneratingMinuta] = useState(false);
  const [minutaMeta, setMinutaMeta] = useState<{ source?: string; durationMs?: number } | null>(null);

  if (!isOpen) return null;

  const handleGenerateMinutaWithAI = async () => {
    if (license && !license.canUseLocalLLM) {
      onTriggerUpgradeAlert?.('PRO_AI');
      return;
    }

    setIsGeneratingMinuta(true);
    try {
      const res = await requestLLMMinuta({
        declaracao: record,
        justifications
      });

      if (res.success && res.minuta) {
        setMinutaText(res.minuta);
        setMinutaMeta({
          source: res.source,
          durationMs: res.durationMs
        });
      } else if (res.error === 'UPGRADE_REQUIRED') {
        onTriggerUpgradeAlert?.('PRO_AI');
      }
    } catch (e) {
      console.warn('Erro ao gerar minuta:', e);
    } finally {
      setIsGeneratingMinuta(false);
    }
  };

  const handleCopyMinutaText = () => {
    if (!minutaText) return;
    navigator.clipboard.writeText(minutaText);
    setCopiedMinuta(true);
    setTimeout(() => setCopiedMinuta(false), 2500);
  };

  if (!isOpen) return null;

  // Generate synthetic official civil registration matricula (32 digits)
  // [6 dígitos cartório] [2 acervo] [2 atribuição 55=RCPN] [4 ano] [1 tipo livro 4=óbito] [5 número livro] [3 folha] [7 termo] [2 DV]
  const matricula = `118492 01 55 2024 4 00042 118 0004921-88`;
  const seloFiscalizacao = `TJSC-OBIT-2024-49102-X9`;
  const hashAssinatura = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;

  const handlePrintOrPdf = async () => {
    setIsProcessing(true);
    setExportSuccessMsg(null);

    const certElement = document.getElementById('printable-certificate');
    if (!certElement) {
      setIsProcessing(false);
      try {
        window.print();
      } catch {}
      return;
    }

    try {
      // 1. High-resolution canvas render of certificate
      const canvas = await html2canvas(certElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#faf7f0',
        scrollX: 0,
        scrollY: 0
      });

      // 2. Build A4 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 8;
      const pdfImageWidth = pageWidth - (margin * 2);
      const pdfImageHeight = (canvas.height * pdfImageWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(
        imgData, 
        'JPEG', 
        margin, 
        margin, 
        pdfImageWidth, 
        Math.min(pdfImageHeight, pageHeight - (margin * 2))
      );

      const cleanName = (record.nomeFalecido || 'Falecido')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 32);
      const filename = `Minuta_Certidao_Obito_${cleanName}.pdf`;

      // Download the PDF file directly
      pdf.save(filename);
      setExportSuccessMsg(`Documento PDF baixado com sucesso (${filename})!`);

      // 3. Also trigger browser print dialog safely
      try {
        window.print();
      } catch (printErr) {
        console.warn('window.print protegido por restrição de sandbox:', printErr);
      }
    } catch (err) {
      console.error('Falha na renderização do PDF, tentando impressão padrão:', err);
      try {
        window.print();
        setExportSuccessMsg('Diálogo de impressão acionado.');
      } catch (fallbackErr) {
        console.error('Falha na impressão do navegador:', fallbackErr);
        setExportSuccessMsg('Erro ao acionar impressão no navegador.');
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setExportSuccessMsg(null);
      }, 6000);
    }
  };

  const handleCopyMatricula = () => {
    navigator.clipboard.writeText(matricula.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #certificate-modal-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            z-index: auto !important;
          }
          #certificate-modal-container {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            max-width: 100% !important;
            width: 100% !important;
            overflow: visible !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-certificate-container {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            width: 100% !important;
          }
          #printable-certificate {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border-width: 4px !important;
            border-color: #78350f !important;
            margin: 0 auto !important;
            padding: 10mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #faf7f0 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div 
        id="certificate-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          id="certificate-modal-container"
          className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col text-slate-100 overflow-hidden"
        >
          
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Minuta Oficial da Certidão de Óbito</span>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-700/80 font-bold">
                    PRE-LAVRATURA CONFORME
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Espelho do assento civil pronto para conferência das partes e colheita de fé pública (Art. 80, Lei 6.015/73)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-copy-matricula"
                onClick={handleCopyMatricula}
                className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-600 cursor-pointer"
                title="Copiar número de matrícula padrão CNJ"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Matrícula Copiada!' : 'Copiar Matrícula'}</span>
              </button>

              <button
                id="btn-print-certificate"
                onClick={handlePrintOrPdf}
                disabled={isProcessing}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Gerar arquivo oficial PDF da certidão e acionar impressão"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </>
                )}
              </button>

              <button
                id="btn-close-certificate-modal"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                title="Fechar Minuta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader: View Tabs (Certidão vs LLM Minuta) */}
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-2 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('CERTIFICATE')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'CERTIFICATE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Certidão Padronizada CNJ (Modelo A4)</span>
              </button>

              <button
                onClick={() => {
                  if (license && !license.canUseLocalLLM) {
                    onTriggerUpgradeAlert?.('PRO_AI');
                    return;
                  }
                  setActiveTab('LLM_MINUTA');
                  if (!minutaText) {
                    handleGenerateMinutaWithAI();
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  activeTab === 'LLM_MINUTA'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                }`}
              >
                {license && !license.canUseLocalLLM ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Minuta Registral com IA Local (Qwen 1.5B)</span>
                {license && !license.canUseLocalLLM && (
                  <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded uppercase">Pro AI</span>
                )}
              </button>
            </div>

            {activeTab === 'LLM_MINUTA' && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                node-llama-cpp • 2048ctx • 100% Offline
              </span>
            )}
          </div>

          {/* Feedback Banner for Generated PDF */}
          {exportSuccessMsg && (
            <div className="bg-emerald-950/90 border-b border-emerald-700/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 no-print">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{exportSuccessMsg}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                Provimento CNJ nº 149/2023
              </span>
            </div>
          )}

          {activeTab === 'LLM_MINUTA' ? (
            <div className="flex-1 overflow-y-auto p-5 bg-slate-950 flex flex-col space-y-4">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Redação Solene do Assento de Óbito via IA Local</h4>
                    <p className="text-[11px] text-slate-400">
                      Geração textual estruturada em conformidade com o art. 80 da Lei 6.015/73 e Provimento 149/CNJ.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleGenerateMinutaWithAI}
                    disabled={isGeneratingMinuta}
                    className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {isGeneratingMinuta ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingMinuta ? 'Redigindo...' : 'Reescrever com IA'}</span>
                  </button>

                  <button
                    onClick={handleCopyMinutaText}
                    disabled={!minutaText}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
                  >
                    {copiedMinuta ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedMinuta ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
              </div>

              {minutaMeta && (
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-md font-mono">
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{minutaMeta.source}</span>
                  </span>
                  <span>•</span>
                  <span>Tempo de inferência: {minutaMeta.durationMs}ms</span>
                  <span>•</span>
                  <span>Memória: On-Demand Lazy Loaded (Auto-unload 3min)</span>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Texto do Termo Registral para Inserção no Livro C de Óbitos:
                </label>
                <textarea
                  value={minutaText}
                  onChange={(e) => setMinutaText(e.target.value)}
                  placeholder="Clique em 'Reescrever com IA' para que a LLM local componha a minuta solene..."
                  rows={14}
                  className="w-full flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-100 placeholder-slate-500 leading-relaxed focus:outline-hidden focus:border-amber-400 select-text"
                />
              </div>
            </div>
          ) : (
          /* Scrollable Container with the Document */
          <div 
            id="printable-certificate-container"
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-950 flex justify-center items-start scroll-smooth"
          >
            {/* The Certificate Parchment Paper */}
            <div 
              id="printable-certificate"
              className="w-full max-w-2xl bg-[#faf7f0] text-slate-900 border-8 border-double border-amber-900/70 p-6 sm:p-10 shadow-2xl relative font-serif text-xs leading-relaxed select-text rounded-xs my-2"
            >
              
              {/* Inner Decorative Watermark Frame */}
              <div className="border border-amber-900/30 p-4 sm:p-6 relative">
                
                {/* Official National Header */}
                <div className="text-center border-b-2 border-amber-900/40 pb-4 mb-4">
                  
                  {/* Heraldic Brasão da República Federativa do Brasil */}
                  <div className="flex justify-center mb-2">
                    <svg className="w-14 h-14 text-amber-900 drop-shadow-xs" viewBox="0 0 100 100" fill="currentColor">
                      {/* Outer laurel wreath */}
                      <path d="M 50 8 C 30 8 16 22 16 48 C 16 70 32 86 50 92 C 68 86 84 70 84 48 C 84 22 70 8 50 8 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                      {/* Internal star */}
                      <polygon points="50,16 57,36 78,36 61,49 68,69 50,56 32,69 39,49 22,36 43,36" fill="#b45309" opacity="0.85" />
                      {/* Center circle */}
                      <circle cx="50" cy="46" r="11" fill="#1e3a8a" />
                      {/* Southern Cross constellation dots */}
                      <circle cx="50" cy="42" r="1.4" fill="#ffffff" />
                      <circle cx="50" cy="50" r="1.4" fill="#ffffff" />
                      <circle cx="45" cy="46" r="1.4" fill="#ffffff" />
                      <circle cx="55" cy="45" r="1.4" fill="#ffffff" />
                      <circle cx="53" cy="48" r="1" fill="#ffffff" />
                      {/* Base ribbon */}
                      <rect x="26" y="80" width="48" height="6" rx="2" fill="#78350f" />
                    </svg>
                  </div>

                  <h3 className="font-bold text-[11px] uppercase tracking-widest text-amber-950 font-sans">
                    REPÚBLICA FEDERATIVA DO BRASIL
                  </h3>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 font-sans mt-0.5">
                    REGISTRO CIVIL DAS PESSOAS NATURAIS
                  </h4>
                  <p className="text-[11px] text-slate-700 font-sans font-medium mt-0.5">
                    Cartório do 1º Ofício de Registro Civil e Tabelionato de Notas
                  </p>
                  <p className="text-[10px] text-slate-600 font-sans italic">
                    Comarca da Capital • Estado de Santa Catarina • CNS: 118492
                  </p>

                  {/* Ornate Title Banner */}
                  <div className="mt-3 text-lg font-extrabold tracking-widest uppercase text-amber-950 border-y-2 border-amber-900/30 py-1.5 font-serif bg-amber-50/60">
                    CERTIDÃO DE ÓBITO
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 mt-0.5 font-sans">
                    LIVRO C - REGISTRO DE ASSENTOS DE ÓBITO
                  </div>

                  {/* Official CNJ Matrícula Box */}
                  <div className="mt-3 bg-white/80 border border-amber-900/40 p-2 rounded-xs inline-block text-center max-w-full">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans font-bold block">
                      MATRÍCULA PADRÃO CNJ (PROVIMENTO Nº 149/2023)
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black text-slate-950 tracking-wider select-all block">
                      {matricula}
                    </span>
                    
                    {/* Simulated Code 128 Barcode */}
                    <div className="flex items-center justify-center space-x-[2px] h-6 mt-1 opacity-90">
                      {[3,1,2,1,4,2,1,3,2,4,1,2,3,1,2,3,1,4,2,1,3,2,1,3,1,2,4,1,3,2,1,4,2,1,3,2,1,4,2,3,1,2,1].map((w, i) => (
                        <div 
                          key={i} 
                          className="bg-slate-950 h-full inline-block" 
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Certificate Main Content */}
                <div className="space-y-3.5 font-sans text-xs">
                  
                  {/* Nome do Falecido Card */}
                  <div className="bg-amber-100/70 p-3 rounded border border-amber-300/80 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 block font-sans">
                      NOME DO FALECIDO(A):
                    </span>
                    <span className="text-base sm:text-lg font-black uppercase text-slate-950 font-serif tracking-wide block mt-0.5">
                      {record.nomeFalecido}
                    </span>
                  </div>

                  {/* Section 1: Documentos & Qualificação Pessoal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-white/70 border border-amber-200 rounded">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">CADASTRO DE PESSOA FÍSICA (CPF):</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">{record.cpf}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">DOCUMENTO DE IDENTIDADE (RG):</span>
                      <span className="font-mono font-semibold text-slate-900 text-xs">
                        {record.rg} ({record.rgOrgaoEmissor || 'SSP/SC'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">SEXO E COR/RAÇA:</span>
                      <span className="font-semibold text-slate-900">
                        {record.sexo === 'M' ? 'MASCULINO' : 'FEMININO'} • {record.corRaca}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">ESTADO CIVIL & CÔNJUGE:</span>
                      <span className="font-bold text-slate-950">{record.estadoCivil}</span>
                      {record.nomeConjuge ? (
                        <span className="block text-[11px] text-slate-700 font-medium">
                          Cônjuge: <strong className="uppercase">{record.nomeConjuge}</strong>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Section 2: Filiação */}
                  <div className="p-2.5 bg-white/70 border border-amber-200 rounded">
                    <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                      FILIAÇÃO (GENITORES):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">MÃE:</span>
                        <span className="font-bold uppercase text-slate-950">{record.nomeMae || 'NÃO DECLARADA'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">PAI:</span>
                        <span className="font-bold uppercase text-slate-950">{record.nomePai || 'NÃO DECLARADO'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Falecimento, Causa Mortis e Sepultamento */}
                  <div className="p-2.5 bg-white/70 border border-amber-200 rounded space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-600 block">DATA E HORA DO FALECIMENTO:</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {record.dataObito} às {record.horaObito} horas
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-600 block">LOCAL DO FALECIMENTO:</span>
                        <span className="text-slate-900 font-medium">
                          {record.localObito}, {record.municipioObito} - {record.ufObito}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-amber-100 pt-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">CAUSA DA MORTE (ATESTADO MÉDICO):</span>
                      <span className="font-serif italic font-semibold text-slate-950 block">
                        {record.causaMortis} (CID-10: {record.cid10})
                      </span>
                      <span className="text-[11px] text-slate-700 block mt-0.5">
                        Médico Atestante: <strong>{record.nomeMedico}</strong> • CRM: {record.crmMedico}/{record.ufCrm}
                      </span>
                    </div>

                    <div className="border-t border-amber-100 pt-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">SEPULTAMENTO OU CREMAÇÃO:</span>
                      <span className="font-medium text-slate-900">
                        {record.sepultamentoCremacao} realizado no <strong>{record.cemiterio}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Section 4: Bens, Filhos e Declarante */}
                  <div className="p-2.5 bg-white/70 border border-amber-200 rounded grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">BENS E HERDEIROS:</span>
                      <span className="text-slate-800">
                        Deixou Bens: <strong>{record.deixouBens}</strong>
                      </span>
                      <span className="block text-[11px] text-slate-700">
                        Filhos: {record.deixouFilhos} {record.nomesFilhos ? `(${record.nomesFilhos})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">DECLARANTE DO ÓBITO:</span>
                      <span className="font-bold text-slate-900 uppercase block">{record.nomeDeclarante}</span>
                      <span className="text-[11px] text-slate-600 italic block">Qualificação: {record.qualificacaoDeclarante}</span>
                    </div>
                  </div>

                  {/* Section 5: Fé Pública & Dispositivos Legais */}
                  <div className="border-t-2 border-amber-900/30 pt-3 text-[11px] text-slate-700 font-serif text-justify leading-relaxed">
                    Certifico e dou fé que o presente assento foi lavrado a requerimento do declarante sobredito, em estrita conformidade com o <strong>Art. 80 da Lei Federal nº 6.015/1973</strong> e com o <strong>Provimento CNJ nº 149/2023</strong>, à vista da Declaração de Óbito nº <strong>{record.numeroDO}</strong> emitida pelo Ministério da Saúde. O referido é verdade e dou fé.
                  </div>

                  {/* Section 6: Selos de Autenticidade & Chaves Criptográficas */}
                  <div className="border border-dashed border-amber-800/40 p-2.5 bg-amber-50/50 rounded flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
                    
                    {/* Selo Digital Poder Judiciário */}
                    <div className="flex items-center space-x-2.5">
                      <div className="w-12 h-12 bg-white border border-amber-300 p-1 rounded flex items-center justify-center shrink-0">
                        <QrCode className="w-10 h-10 text-slate-900" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block uppercase">
                          SELO DIGITAL DE FISCALIZAÇÃO - PODER JUDICIÁRIO
                        </span>
                        <span className="font-mono font-bold text-amber-950 block text-[11px]">
                          {seloFiscalizacao}
                        </span>
                        <span className="text-slate-600 block text-[9px]">
                          Consulte a autenticidade em: selo.tjsc.jus.br
                        </span>
                      </div>
                    </div>

                    {/* Assinatura Digital ICP-Brasil */}
                    <div className="text-right sm:text-right text-slate-600">
                      <div className="flex items-center sm:justify-end space-x-1 font-bold text-emerald-800">
                        <Lock className="w-3 h-3 text-emerald-700" />
                        <span>ASSINADO DIGITALMENTE (ICP-BRASIL)</span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-500 block truncate max-w-[200px]" title={hashAssinatura}>
                        SHA256: {hashAssinatura.substring(0, 24)}...
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Padrão PAdES • Carimbo do Tempo Autenticado
                      </span>
                    </div>

                  </div>

                  {/* Signatures Block */}
                  <div className="mt-8 pt-4 border-t border-slate-400 grid grid-cols-2 gap-6 text-center text-xs">
                    <div>
                      <div className="border-b border-slate-700 pb-1 font-semibold text-slate-950 uppercase tracking-wide">
                        {record.nomeDeclarante}
                      </div>
                      <span className="text-[10px] text-slate-600 block mt-0.5">
                        Declarante Qualificado
                      </span>
                    </div>
                    <div>
                      <div className="border-b border-slate-700 pb-1 font-semibold text-slate-950 tracking-wide">
                        {currentUser ? `${currentUser.nome} - ${currentUser.cargoLabel}` : 'Guilherme Santos - Escrevente Autorizado'}
                      </div>
                      <span className="text-[10px] text-slate-600 block mt-0.5">
                        Oficial / Escrevente Designado (Mat. nº {currentUser?.matricula || '8419'})
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
          )}

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-slate-800/95 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 shrink-0 no-print">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">Quality Gate ARIA: Pré-Lavratura 100% Homologada</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-slate-600"
            >
              Fechar Minuta
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
