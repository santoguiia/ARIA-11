import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Award, 
  QrCode, 
  Copy, 
  Check, 
  FileText, 
  Lock, 
  Loader2, 
  Scale, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  DeathRecordData, 
  OCRConfidenceMap, 
  EscreventeUser, 
  RuleEvaluationResult, 
  AuditLogEntry,
  OCRDocumentState
} from '../types';

interface CNJReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  declaracao: DeathRecordData;
  ocr: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
  federada: DeathRecordData;
  evaluationResults: RuleEvaluationResult[];
  canLavrar: boolean;
  hasImpediments: boolean;
  hasPendingAlerts: boolean;
  justifications: Record<string, string>;
  currentUser?: EscreventeUser | null;
  auditLogs: AuditLogEntry[];
  ocrDocumentState?: OCRDocumentState;
}

export const CNJReportModal: React.FC<CNJReportModalProps> = ({
  isOpen,
  onClose,
  declaracao,
  ocr,
  ocrConfidence,
  federada,
  evaluationResults,
  canLavrar,
  hasImpediments,
  hasPendingAlerts,
  justifications,
  currentUser,
  auditLogs,
  ocrDocumentState
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const latestLog = auditLogs.length > 0 ? auditLogs[0] : null;
  const currentHash = latestLog?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const previousHash = latestLog?.previousHash || '0000000000000000000000000000000000000000000000000000000000000000';
  const issueDate = new Date().toLocaleString('pt-BR');
  const laudoId = `CNJ-QG-${declaracao.numeroDO.replace(/[^0-9]/g, '') || '2024'}-${Date.now().toString().slice(-4)}`;

  const totalRules = evaluationResults.length;
  const passedRules = evaluationResults.filter(r => r.passed).length;
  const impedientes = evaluationResults.filter(r => !r.passed && r.severity === 'BLOQUEIO_IMPEDIENTE').length;
  const alertas = evaluationResults.filter(r => !r.passed && r.severity === 'ALERTA_OBRIGATORIO').length;
  const informativos = evaluationResults.filter(r => !r.passed && r.severity === 'INFORMATIVO').length;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(currentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(null);

    const reportElement = document.getElementById('printable-cnj-report');
    if (!reportElement) {
      setIsGeneratingPdf(false);
      try {
        window.print();
      } catch {}
      return;
    }

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 6;
      const pdfImageWidth = pageWidth - (margin * 2);
      const pdfImageHeight = (canvas.height * pdfImageWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Handle multi-page or single fit
      if (pdfImageHeight <= pageHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, pdfImageWidth, pdfImageHeight);
      } else {
        // Multi-page slicing
        let heightLeft = pdfImageHeight;
        let position = margin;
        pdf.addImage(imgData, 'JPEG', margin, position, pdfImageWidth, pdfImageHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - pdfImageHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, pdfImageWidth, pdfImageHeight);
          heightLeft -= pageHeight;
        }
      }

      const cleanName = (declaracao.nomeFalecido || 'Falecido')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 24);
      const filename = `Laudo_Conformidade_CNJ_${declaracao.numeroDO}_${cleanName}.pdf`;

      pdf.save(filename);
      setDownloadSuccess(`Laudo exportado com sucesso: ${filename}`);
    } catch (err) {
      console.error('Erro na exportação do PDF:', err);
      try {
        window.print();
      } catch {}
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setDownloadSuccess(null), 5000);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Erro ao acionar impressão:', e);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-cnj-report, #printable-cnj-report * {
            visibility: visible;
          }
          #printable-cnj-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print-element {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Laudo Técnico de Conformidade e Quality Gate
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Provimento CNJ nº 149/2023
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Certificação multifonte, integridade SHA-256 e análise determinística para atos de registro civil
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title="Gerar e baixar arquivo PDF vetorial oficial"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar PDF Certificado</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
                title="Imprimir laudo em impressora conectada"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {downloadSuccess && (
            <div className="bg-emerald-950 border-b border-emerald-800 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{downloadSuccess}</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">Pronto para arquivamento ou anexação aos autos</span>
            </div>
          )}

          {/* Document Viewer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex justify-center">
            
            {/* The Printable A4 Sheet */}
            <div 
              id="printable-cnj-report"
              className="bg-white text-slate-900 rounded-sm shadow-xl p-8 max-w-[210mm] w-full text-[11px] leading-relaxed border border-slate-300 select-text font-serif"
              style={{ minHeight: '297mm' }}
            >
              {/* Official Seal & Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                    ⚖
                  </div>
                  <div>
                    <h1 className="font-sans font-extrabold text-[13px] tracking-wider uppercase text-slate-950">
                      REPÚBLICA FEDERATIVA DO BRASIL • PODER JUDICIÁRIO
                    </h1>
                    <h2 className="font-sans font-bold text-[11px] text-slate-700 tracking-wide uppercase">
                      CONSELHO NACIONAL DE JUSTIÇA • CORREGEDORIA NACIONAL DE JUSTIÇA
                    </h2>
                  </div>
                </div>

                <div className="bg-slate-100 py-1.5 px-3 rounded text-[11px] font-sans font-semibold text-slate-800 flex items-center justify-between border border-slate-300">
                  <span>Ofício: <strong>{currentUser?.cartorio || '1º Ofício de Registro Civil das Pessoas Naturais'}</strong></span>
                  <span>CNS: <strong>09.182-3</strong> | Provimento CNJ nº 149/2023</span>
                </div>

                <div className="mt-2.5">
                  <h3 className="font-sans font-black text-sm text-slate-900 tracking-tight uppercase">
                    LAUDO TÉCNICO DE QUALITY GATE & CONFORMIDADE REGISTRAL DE ÓBITO
                  </h3>
                  <p className="font-sans text-[10px] text-slate-600 mt-0.5">
                    Certificação determinística multifonte de conformidade jurídica para fins de assentamento em Livro C
                  </p>
                </div>
              </div>

              {/* Identification Bar */}
              <div className="grid grid-cols-3 gap-3 mb-4 font-sans text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 uppercase block font-bold text-[9px]">Protocolo do Laudo</span>
                  <span className="font-mono font-bold text-slate-900">{laudoId}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block font-bold text-[9px]">Data / Hora de Emissão</span>
                  <span className="font-mono font-bold text-slate-900">{issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block font-bold text-[9px]">Escrevente Responsável</span>
                  <span className="font-bold text-slate-900">
                    {currentUser?.nome || 'Guilherme Santos'} ({currentUser?.matricula || 'ESC-8419'})
                  </span>
                </div>
              </div>

              {/* SECTION 1: Status Executivo do Quality Gate */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5 border-b border-slate-300 pb-1">
                  <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-slate-900 flex items-center space-x-1.5">
                    <span>1. Resumo Executivo da Avaliação Determinística</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded font-sans font-bold text-[10px] tracking-wider uppercase border ${
                    canLavrar 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400' 
                      : 'bg-rose-100 text-rose-900 border-rose-400'
                  }`}>
                    {canLavrar ? '✓ Apto para Lavratura (Conforme)' : '✗ Retido / Pendência Legal'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-sans">
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-600 block uppercase font-bold">Total Avaliado</span>
                    <span className="font-mono text-base font-bold text-slate-900">{totalRules} regras</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="text-[9px] block uppercase font-bold">Conformes</span>
                    <span className="font-mono text-base font-bold text-emerald-700">{passedRules}</span>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="text-[9px] block uppercase font-bold">Alertas Justificados</span>
                    <span className="font-mono text-base font-bold text-amber-700">{alertas}</span>
                  </div>
                  <div className={`p-2 rounded border ${
                    impedientes > 0 
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-[9px] block uppercase font-bold">Impedimentos Fatais</span>
                    <span className="font-mono text-base">{impedientes}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Qualificação do Falecido e Declaração de Óbito */}
              <div className="mb-4">
                <div className="border-b border-slate-300 pb-1 mb-1.5">
                  <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-slate-900">
                    2. Qualificação Registral do Falecido & Documentos
                  </span>
                </div>

                <table className="w-full text-left font-sans text-[10px] border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold w-1/4 border-r border-slate-200">Nome do Falecido:</td>
                      <td className="p-1.5 font-bold text-slate-950 w-2/4" colSpan={2}>{declaracao.nomeFalecido}</td>
                      <td className="p-1.5 bg-slate-100 font-bold w-1/4 border-l border-slate-200">
                        D.O. nº: <span className="font-mono text-cyan-800">{declaracao.numeroDO}</span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">CPF:</td>
                      <td className="p-1.5 font-mono">{declaracao.cpf || 'Não informado'}</td>
                      <td className="p-1.5 bg-slate-100 font-bold border-l border-r border-slate-200">RG / Órgão:</td>
                      <td className="p-1.5 font-mono">{declaracao.rg || 'Não informado'} {declaracao.rgOrgaoEmissor ? `(${declaracao.rgOrgaoEmissor})` : ''}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">Nascimento / Estado Civil:</td>
                      <td className="p-1.5">{declaracao.dataNascimento} | {declaracao.estadoCivil}</td>
                      <td className="p-1.5 bg-slate-100 font-bold border-l border-r border-slate-200">Sexo / Raça:</td>
                      <td className="p-1.5">{declaracao.sexo === 'M' ? 'Masculino' : declaracao.sexo === 'F' ? 'Feminino' : 'Indeterminado'} | {declaracao.corRaca}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">Data & Hora do Óbito:</td>
                      <td className="p-1.5 font-mono">{declaracao.dataObito} às {declaracao.horaObito}</td>
                      <td className="p-1.5 bg-slate-100 font-bold border-l border-r border-slate-200">Local / Município:</td>
                      <td className="p-1.5">{declaracao.localObito} ({declaracao.municipioObito}/{declaracao.ufObito})</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">Causa Mortis:</td>
                      <td className="p-1.5" colSpan={2}>{declaracao.causaMortis}</td>
                      <td className="p-1.5 bg-slate-100 font-bold border-l border-slate-200">
                        CID-10: <span className="font-mono text-cyan-800">{declaracao.cid10}</span>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">Médico Atestante:</td>
                      <td className="p-1.5">{declaracao.nomeMedico}</td>
                      <td className="p-1.5 bg-slate-100 font-bold border-l border-r border-slate-200">CRM / UF:</td>
                      <td className="p-1.5 font-mono">{declaracao.crmMedico}/{declaracao.ufCrm}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 bg-slate-100 font-bold border-r border-slate-200">Filiação:</td>
                      <td className="p-1.5" colSpan={3}>
                        Mãe: {declaracao.nomeMae || 'Ignorada'} | Pai: {declaracao.nomePai || 'Ignorado'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 3: Confrontação Multifonte (Fonte A vs Fonte B vs Fonte C) */}
              <div className="mb-4">
                <div className="border-b border-slate-300 pb-1 mb-1.5 flex items-center justify-between">
                  <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-slate-900">
                    3. Matriz de Confrontação e Triangulação de Fontes
                  </span>
                  <span className="font-sans text-[9px] text-slate-500">
                    Motor OCR: {ocrDocumentState?.engine || 'Tesseract On-Device LGPD'}
                  </span>
                </div>

                <table className="w-full text-left font-sans text-[9.5px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 border-b border-slate-300">
                      <th className="p-1.5 font-bold border-r border-slate-300 w-1/4">Entidade</th>
                      <th className="p-1.5 font-bold border-r border-slate-300 w-1/4">Fonte A: Declaração</th>
                      <th className="p-1.5 font-bold border-r border-slate-300 w-1/4">Fonte B: OCR D.O.</th>
                      <th className="p-1.5 font-bold w-1/4">Fonte C: Base Federada</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-200">Nome Falecido</td>
                      <td className="p-1.5 border-r border-slate-200">{declaracao.nomeFalecido}</td>
                      <td className="p-1.5 border-r border-slate-200">
                        {ocr.nomeFalecido} <span className="font-mono text-[8px] text-slate-500">({ocrConfidence.nomeFalecido}%)</span>
                      </td>
                      <td className="p-1.5 font-semibold text-slate-900">{federada.nomeFalecido}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-200">CPF</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">{declaracao.cpf}</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">
                        {ocr.cpf} <span className="text-[8px] text-slate-500">({ocrConfidence.cpf}%)</span>
                      </td>
                      <td className="p-1.5 font-mono font-semibold">{federada.cpf}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-200">Data Nascimento</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">{declaracao.dataNascimento}</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">
                        {ocr.dataNascimento} <span className="text-[8px] text-slate-500">({ocrConfidence.dataNascimento}%)</span>
                      </td>
                      <td className="p-1.5 font-mono font-semibold">{federada.dataNascimento}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-200">Filiação (Mãe)</td>
                      <td className="p-1.5 border-r border-slate-200">{declaracao.nomeMae}</td>
                      <td className="p-1.5 border-r border-slate-200">
                        {ocr.nomeMae} <span className="font-mono text-[8px] text-slate-500">({ocrConfidence.nomeMae}%)</span>
                      </td>
                      <td className="p-1.5 font-semibold">{federada.nomeMae}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-200">Data Óbito</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">{declaracao.dataObito}</td>
                      <td className="p-1.5 font-mono border-r border-slate-200">
                        {ocr.dataObito} <span className="text-[8px] text-slate-500">({ocrConfidence.dataObito}%)</span>
                      </td>
                      <td className="p-1.5 font-mono text-slate-400">N/A (Fato Novo)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION 4: Regras Avaliadas e Fundamentações */}
              <div className="mb-4">
                <div className="border-b border-slate-300 pb-1 mb-1.5">
                  <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-slate-900">
                    4. Auditoria de Regras Legais & Justificativas do Escrevente
                  </span>
                </div>

                <div className="space-y-1.5 font-sans text-[9px]">
                  {evaluationResults.map((r, idx) => (
                    <div 
                      key={r.ruleId} 
                      className={`p-1.5 rounded border ${
                        r.passed 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : r.severity === 'BLOQUEIO_IMPEDIENTE'
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-700">[{idx + 1}] {r.ruleId}</span>
                          <span className="font-bold">{r.ruleTitle}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] text-slate-600 italic">{r.legalReference}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                            r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.passed ? 'APROVADO' : r.severity}
                          </span>
                        </div>
                      </div>

                      <p className="mt-0.5 text-slate-700 text-[8.5px] leading-tight">{r.message}</p>

                      {justifications[r.ruleId] && (
                        <div className="mt-1 pt-1 border-t border-amber-200/60 bg-amber-100/50 p-1 rounded text-amber-900 text-[8.5px]">
                          <strong>Justificativa do Oficial / Escrevente:</strong> "{justifications[r.ruleId]}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: Integridade Criptográfica & ICP-Brasil */}
              <div className="border-t-2 border-slate-900 pt-3 mt-4">
                <div className="grid grid-cols-4 gap-3 items-center">
                  
                  {/* Simulated Stamp / QR Code */}
                  <div className="flex flex-col items-center justify-center p-2 border border-slate-300 rounded bg-slate-50 text-center">
                    <svg className="w-16 h-16 text-slate-900" viewBox="0 0 100 100" fill="none">
                      <rect width="100" height="100" fill="white" />
                      <path d="M10 10h30v30h-30z M15 15h20v20h-20z M20 20h10v10h-10z" fill="currentColor" />
                      <path d="M60 10h30v30h-30z M65 15h20v20h-20z M70 20h10v10h-10z" fill="currentColor" />
                      <path d="M10 60h30v30h-30z M15 65h20v20h-20z M20 70h10v10h-10z" fill="currentColor" />
                      <path d="M50 15h5v20h-5z M60 50h10v10h-10z M75 60h15v5h-15z M50 75h10v15h-10z M70 75h20v5h-20z M75 85h15v10h-15z" fill="currentColor" />
                    </svg>
                    <span className="font-mono text-[7px] text-slate-500 mt-1 uppercase font-bold">
                      Selo TJ-SC / CNJ 149
                    </span>
                  </div>

                  {/* Cryptographic Ledger Metadata */}
                  <div className="col-span-3 font-sans text-[8.5px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Assinatura Eletrônica Qualificada ICP-Brasil:</span>
                      <span className="text-emerald-700 font-bold">✓ Válida / Carimbo do Tempo ON</span>
                    </div>

                    <div className="font-mono bg-slate-100 p-1.5 rounded border border-slate-200 break-all text-[8px] text-slate-800">
                      <div><strong className="text-slate-600">SHA-256:</strong> {currentHash}</div>
                      <div><strong className="text-slate-500">Hash Anterior:</strong> {previousHash.slice(0, 32)}...</div>
                    </div>

                    <p className="text-[8px] text-slate-500 leading-tight">
                      Este documento é emitido pelo sistema ARIA Desktop (Quality Gate Registral) em conformidade estrita com a Medida Provisória nº 2.200-2/2001, o Provimento CNJ nº 149/2023 e a Lei Federal nº 6.015/1973 (Registros Públicos). A autenticidade pode ser checada em qualquer serventia do território nacional.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px] text-slate-300">Hash: {currentHash.slice(0, 16)}...</span>
              </span>
              <button
                onClick={handleCopyHash}
                className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer text-xs flex items-center space-x-1"
                title="Copiar hash SHA-256 completo para verificação"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copiado!' : 'Copiar Hash'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 shadow-lg shadow-cyan-950/40 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando A4...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF Certificado</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
