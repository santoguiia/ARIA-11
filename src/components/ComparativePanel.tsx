import React, { useState, useRef } from 'react';
import { 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  Copy, 
  FileText, 
  Scan, 
  Database, 
  Sparkles, 
  Info, 
  Calendar, 
  User, 
  HeartCrack, 
  Activity, 
  Award,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  FileUp,
  Loader2,
  Eye,
  Target
} from 'lucide-react';
import { DeathRecordData, OCRConfidenceMap, OCRDocumentState } from '../types';
import { normalizeName, nameSimilarity, validateCPF } from '../engine/validators';
import { DiffHighlight, extractDivergenceSummary } from '../engine/diffHighlight';

interface ComparativePanelProps {
  declaracao: DeathRecordData;
  ocr: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
  federada: DeathRecordData;
  ocrDocumentState?: OCRDocumentState;
  onUploadOCRFile?: (file: File) => void;
  onUpdateDeclaracaoField: (field: keyof DeathRecordData, value: any) => void;
  onCopyFromFederada: (field: keyof DeathRecordData) => void;
  onCopyFromOCR: (field: keyof DeathRecordData) => void;
  onOpenOCRModal: (focusedField?: keyof DeathRecordData) => void;
  onOpenMtlsModal?: () => void;
}

export const ComparativePanel: React.FC<ComparativePanelProps> = ({
  declaracao,
  ocr,
  ocrConfidence,
  federada,
  ocrDocumentState,
  onUploadOCRFile,
  onUpdateDeclaracaoField,
  onCopyFromFederada,
  onCopyFromOCR,
  onOpenOCRModal,
  onOpenMtlsModal
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onUploadOCRFile?.(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onUploadOCRFile?.(file);
    }
  };

  // Helper to determine field match status
  const getFieldStatus = (field: keyof DeathRecordData) => {
    const vDecl = String(declaracao[field] || '').trim();
    const vOcr = String(ocr[field] || '').trim();
    const vFed = String(federada[field] || '').trim();

    // Check if field exists in federada
    const hasFed = vFed.length > 0;
    const hasOcr = vOcr.length > 0;

    // Normalizations for textual comparison
    const normDecl = normalizeName(vDecl);
    const normFed = normalizeName(vFed);
    const normOcr = normalizeName(vOcr);

    // Specialized evaluation for RG + Órgão Emissor
    if (field === 'rg') {
      const cleanDeclRg = vDecl.replace(/\D/g, '');
      const cleanFedRg = vFed.replace(/\D/g, '');
      const cleanDeclEmissor = String(declaracao.rgOrgaoEmissor || '').trim().toUpperCase();
      const cleanFedEmissor = String(federada.rgOrgaoEmissor || '').trim().toUpperCase();

      const hasFedRg = cleanFedRg.length > 0;
      const hasFedEmissor = cleanFedEmissor.length > 0;

      if (hasFedRg && cleanDeclRg !== cleanFedRg) {
        return {
          status: 'MISMATCH',
          label: 'RG Divergente',
          color: 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold animate-pulse',
          hasDivergence: true
        };
      }

      if (hasFedEmissor && cleanDeclEmissor && cleanDeclEmissor !== cleanFedEmissor) {
        return {
          status: 'MISMATCH',
          label: 'Órgão Emissor Divergente',
          color: 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold animate-pulse',
          hasDivergence: true
        };
      }

      if (hasFedRg && cleanDeclRg === cleanFedRg && (!cleanFedEmissor || cleanDeclEmissor === cleanFedEmissor)) {
        return {
          status: 'MATCH',
          label: 'Convergente',
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
          hasDivergence: false
        };
      }
    }

    // Exact match
    if (hasFed && normDecl === normFed) {
      return { 
        status: 'MATCH', 
        label: 'Convergente', 
        color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
        hasDivergence: false
      };
    }

    // High similarity for names
    if (hasFed && (field === 'nomeFalecido' || field === 'nomeMae' || field === 'nomePai' || field === 'nomeConjuge')) {
      const sim = nameSimilarity(vDecl, vFed);
      if (sim >= 0.85) {
        return { 
          status: 'SIMILAR', 
          label: `Similar (${Math.round(sim * 100)}%)`, 
          color: 'text-amber-300 bg-amber-950/60 border-amber-700/80',
          hasDivergence: true
        };
      }
    }

    // Inverted/mismatched critical field
    if (hasFed && normDecl !== normFed) {
      return { 
        status: 'MISMATCH', 
        label: 'Divergente', 
        color: 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold animate-pulse',
        hasDivergence: true
      };
    }

    if (!hasFed && hasOcr && normDecl === normOcr) {
      return { 
        status: 'MATCH_OCR', 
        label: 'Bate com OCR', 
        color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60',
        hasDivergence: false
      };
    }

    if (!hasFed && hasOcr && normDecl !== normOcr) {
      return { 
        status: 'MISMATCH_OCR', 
        label: 'Diverge do OCR', 
        color: 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold',
        hasDivergence: true
      };
    }

    return { 
      status: 'NEUTRAL', 
      label: 'Verificado', 
      color: 'text-slate-400 bg-slate-800 border-slate-700',
      hasDivergence: false
    };
  };

  // Helper for OCR badge with click-to-focus on bounding box
  const renderOCRConfidenceBadge = (confidence?: number, field?: keyof DeathRecordData) => {
    const conf = confidence ?? 90;
    let badgeClass = 'text-emerald-400 bg-emerald-950/70 border-emerald-700 hover:border-emerald-500 hover:bg-emerald-900/50';
    if (conf < 75) {
      badgeClass = 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold hover:border-rose-500 hover:bg-rose-900/60';
    } else if (conf < 85) {
      badgeClass = 'text-amber-300 bg-amber-950/70 border-amber-700 hover:border-amber-500 hover:bg-amber-900/50';
    }

    return (
      <button
        type="button"
        onClick={() => onOpenOCRModal(field)}
        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ml-1.5 flex items-center space-x-1 transition-all cursor-pointer group ${badgeClass}`}
        title={field ? `Ver e destacar trecho de "${field}" na D.O. física com Bounding Box (Confiança: ${conf}%)` : `Confiança OCR: ${conf}%`}
      >
        <span>OCR: {conf}%</span>
        <Eye className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-cyan-400 transition-opacity" />
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* 3-Column Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-800 bg-slate-900/90 text-xs font-semibold select-none shadow-sm">
        {/* Column 1 Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-r border-slate-800 bg-indigo-950/20">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-white font-bold text-xs uppercase tracking-wide">1. Declaração Preliminar</span>
              <p className="text-[10px] text-indigo-300 font-normal">Entrada Manual / Balcão Cartorial (Editável)</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-900/80 text-indigo-200 px-2 py-0.5 rounded font-mono border border-indigo-700">
            FONTE A
          </span>
        </div>

        {/* Column 2 Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-r border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50">
              <Scan className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-white font-bold text-xs uppercase tracking-wide">2. OCR DO Física & RG</span>
              <p className="text-[10px] text-amber-300 font-normal">Tesseract On-Device (LGPD Local-First)</p>
            </div>
          </div>
          <button
            onClick={() => onOpenOCRModal()}
            className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 px-2.5 py-1 rounded font-medium border border-amber-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Visualizar via amarela com bounding boxes ópticos"
          >
            <Scan className="w-3 h-3" />
            <span>Ver DO Física</span>
          </button>
        </div>

        {/* Column 3 Header */}
        <div className="px-4 py-2.5 flex items-center justify-between bg-cyan-950/20">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-white font-bold text-xs uppercase tracking-wide">3. Base Federada Central</span>
              <p className="text-[10px] text-cyan-300 font-normal">CRC Nacional / Receita Federal / SIRC (mTLS)</p>
            </div>
          </div>
          <button
            onClick={onOpenMtlsModal}
            className="text-[10px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-800 flex items-center space-x-1 transition-colors"
            title="Verificar status do túnel criptográfico mTLS"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>FONTE C</span>
          </button>
        </div>
      </div>

      {/* OCR Ingestion & Drag-and-Drop Zone (LGPD Compliant On-Device Pipeline) */}
      <div 
        className={`px-3 py-2.5 mx-2 mt-2 rounded-xl border transition-all ${
          isDraggingOver 
            ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/70 shadow-lg' 
            : 'bg-slate-900/80 border-slate-800'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".pdf,.png,.jpg,.jpeg" 
          onChange={handleFileSelect} 
          className="hidden" 
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border transition-colors shrink-0 ${
              isDraggingOver 
                ? 'bg-amber-500 text-slate-950 border-amber-300' 
                : 'bg-amber-950/80 text-amber-400 border-amber-700/80'
            }`}>
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span>Ingestão & Análise com Visão Computacional (LLM / OCR)</span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded font-mono border border-indigo-700/80 font-semibold flex items-center space-x-1">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  <span>{ocrDocumentState?.engine || 'Vision LLM + OCR Híbrido'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isDraggingOver 
                  ? 'Solte o arquivo escaneado aqui para processar com a Vision LLM...' 
                  : 'Arraste e solte o documento físico (.pdf, .png, .jpeg) para extração de entidades e Bounding Boxes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Selecionar arquivo físico digitalizado (PDF, PNG ou JPEG)"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Selecionar Arquivo Físico</span>
            </button>

            <button
              onClick={() => onOpenOCRModal()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Abrir visualizador com suporte a Bounding Boxes e inspeção óptica"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualizador OCR & Bounding Boxes</span>
            </button>
          </div>
        </div>

        {/* Active Processing Indicator */}
        {ocrDocumentState?.isProcessing && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-medium flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>{ocrDocumentState.processingStep || 'Processando caracteres ópticos com Tesseract local...'}</span>
              </span>
              <span className="font-mono text-xs font-bold text-amber-400">{ocrDocumentState.processingProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 transition-all duration-300"
                style={{ width: `${ocrDocumentState.processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Loaded Document Summary Badge */}
        {ocrDocumentState && !ocrDocumentState.isProcessing && (
          <div className="mt-2 pt-2 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                ocrDocumentState.classification?.isCompatibleDO === false ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`}></span>
              <span>Documento carregado: <strong className="text-slate-200">{ocrDocumentState.fileName}</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-300 font-medium">{Object.keys(ocrDocumentState.fields || {}).length} entidades extraídas</span>
              {ocrDocumentState.classification && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${
                    ocrDocumentState.classification.isCompatibleDO 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}>
                    {ocrDocumentState.classification.typeName}
                  </span>
                </>
              )}
            </div>
            <span className="text-cyan-400 font-mono text-[10px]">
              Dica: clique em "OCR: XX%" na tabela para navegar até a caixa correspondente na imagem
            </span>
          </div>
        )}

        {/* Banner de Validação de Layout e Tipo de Documento Incompatível */}
        {ocrDocumentState?.classification?.warningBanner && (
          <div className={`mt-2.5 p-3 rounded-lg border flex items-start space-x-3 text-xs ${
            ocrDocumentState.classification.warningBanner.severity === 'BLOQUEIO'
              ? 'bg-rose-950/80 border-rose-600 text-rose-100 shadow-md shadow-rose-950/40'
              : 'bg-amber-950/80 border-amber-600 text-amber-100 shadow-md shadow-amber-950/40'
          }`}>
            <div className={`p-1.5 rounded shrink-0 ${
              ocrDocumentState.classification.warningBanner.severity === 'BLOQUEIO'
                ? 'bg-rose-900 text-rose-300'
                : 'bg-amber-900 text-amber-300'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="font-bold flex items-center space-x-2">
                <span>{ocrDocumentState.classification.warningBanner.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider bg-black/40 border border-white/20">
                  {ocrDocumentState.classification.warningBanner.severity}
                </span>
              </div>
              <p className="text-[11px] opacity-95 leading-relaxed">
                {ocrDocumentState.classification.warningBanner.message}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2">
                <span className="font-semibold text-white">
                  Orientação: {ocrDocumentState.classification.warningBanner.recommendation}
                </span>
                <button
                  onClick={() => onOpenOCRModal?.('nomeFalecido')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium border border-slate-700 cursor-pointer flex items-center space-x-1 shrink-0 self-start sm:self-auto"
                >
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Inspecionar Bounding Boxes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Scrollable Compare View */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        
        {/* SECTION: IDENTIFICAÇÃO DO FALECIDO & DOCUMENTAÇÃO */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800/70 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Identificação Básica & Registros Civis</span>
            </div>
            <span className="text-[10px] text-slate-400">Lei 6.015/73 - Art. 80</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            
            {/* ROW: Número da Declaração de Óbito */}
            <CompareRow
              label="Número da D.O. (Guia do MS)"
              field="numeroDO"
              status={getFieldStatus('numeroDO')}
              col1={
                <input
                  type="text"
                  value={declaracao.numeroDO}
                  onChange={(e) => onUpdateDeclaracaoField('numeroDO', e.target.value)}
                  className={`w-full rounded px-2 py-1 text-xs font-mono focus:outline-none ${
                    getFieldStatus('numeroDO').hasDivergence 
                      ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/50' 
                      : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                  }`}
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold">
                    <DiffHighlight current={ocr.numeroDO} reference={declaracao.numeroDO} />
                  </span>
                  {renderOCRConfidenceBadge(ocrConfidence.numeroDO, 'numeroDO')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300">
                    <DiffHighlight current={federada.numeroDO} reference={declaracao.numeroDO} />
                  </span>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('numeroDO')}
                    title="Usar número da Base Federada"
                  />
                </div>
              }
            />

            {/* ROW: Nome do Falecido */}
            <CompareRow
              label="Nome Completo do Falecido"
              field="nomeFalecido"
              status={getFieldStatus('nomeFalecido')}
              divergenceNote={
                getFieldStatus('nomeFalecido').hasDivergence ? (
                  <span className="text-[10px] text-rose-300 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Divergência de grafia entre a Declaração e a Base Federada / OCR. Parte divergente em vermelho.</span>
                  </span>
                ) : undefined
              }
              col1={
                <div className="relative">
                  <input
                    type="text"
                    value={declaracao.nomeFalecido}
                    onChange={(e) => onUpdateDeclaracaoField('nomeFalecido', e.target.value)}
                    className={`w-full rounded px-2 py-1 text-xs uppercase font-medium focus:outline-none ${
                      getFieldStatus('nomeFalecido').hasDivergence 
                        ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/60 font-bold' 
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                    }`}
                  />
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <div className="font-medium uppercase">
                    <DiffHighlight current={ocr.nomeFalecido} reference={declaracao.nomeFalecido} />
                  </div>
                  {renderOCRConfidenceBadge(ocrConfidence.nomeFalecido, 'nomeFalecido')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold uppercase text-cyan-300">
                    <DiffHighlight current={federada.nomeFalecido} reference={declaracao.nomeFalecido} />
                  </div>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('nomeFalecido')}
                    title="Preencher com o nome originário da CRC"
                  />
                </div>
              }
            />

            {/* ROW: CPF */}
            {(() => {
              const cpfValidation = validateCPF(declaracao.cpf);
              const isInvalidAlgo = !cpfValidation.valid && declaracao.cpf.trim().length > 0;
              const cpfStatus = isInvalidAlgo ? {
                status: 'MISMATCH' as const,
                label: 'Dígito Inválido (RFB)',
                color: 'text-rose-300 bg-rose-950/80 border-rose-700 font-bold',
                hasDivergence: true
              } : getFieldStatus('cpf');

              return (
                <CompareRow
                  label="Cadastro de Pessoas Físicas (CPF)"
                  field="cpf"
                  status={cpfStatus}
                  divergenceNote={
                    isInvalidAlgo ? (
                      <div className="space-y-1 mt-1">
                        <span className="text-[10px] text-rose-300 flex items-center space-x-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{cpfValidation.error}.</span>
                        </span>
                        {cpfValidation.suggestedValidCPF && (
                          <div className="flex items-center space-x-2 text-[10px] bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                            <span className="text-slate-300">
                              Dígitos calculados pelo Módulo 11: <strong className="text-emerald-400 font-mono">-{cpfValidation.expectedCheckDigits}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateDeclaracaoField('cpf', cpfValidation.suggestedValidCPF!)}
                              className="px-1.5 py-0.5 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 rounded font-semibold transition-colors flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Aplicar: {cpfValidation.suggestedValidCPF}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : getFieldStatus('cpf').hasDivergence ? (
                      <span className="text-[10px] text-rose-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Incompatibilidade cadastral de CPF com a Receita Federal (RFB).</span>
                      </span>
                    ) : undefined
                  }
                  col1={
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={declaracao.cpf}
                        onChange={(e) => onUpdateDeclaracaoField('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        className={`w-full rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none ${
                          isInvalidAlgo || getFieldStatus('cpf').hasDivergence 
                            ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500/70' 
                            : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                        }`}
                      />
                      {isInvalidAlgo && cpfValidation.suggestedValidCPF && (
                        <button
                          type="button"
                          onClick={() => onUpdateDeclaracaoField('cpf', cpfValidation.suggestedValidCPF!)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono flex items-center space-x-1"
                          title="Auto-corrigir dígitos verificadores calculados oficialmente"
                        >
                          <span>Auto-corrigir dígitos: {cpfValidation.suggestedValidCPF}</span>
                        </button>
                      )}
                    </div>
                  }
                  col2={
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-200">
                        <DiffHighlight current={ocr.cpf} reference={declaracao.cpf} />
                      </span>
                      {renderOCRConfidenceBadge(ocrConfidence.cpf, 'cpf')}
                    </div>
                  }
                  col3={
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-cyan-300">
                        <DiffHighlight current={federada.cpf} reference={declaracao.cpf} />
                      </span>
                      <CopyAction
                        onCopy={() => onCopyFromFederada('cpf')}
                        title="Copiar CPF validado na Receita Federal"
                      />
                    </div>
                  }
                />
              );
            })()}

            {/* ROW: RG / Órgão Emissor */}
            {(() => {
              const cleanDeclRg = declaracao.rg.replace(/\D/g, '');
              const cleanFedRg = federada.rg.replace(/\D/g, '');
              const isRgDiff = cleanFedRg.length > 0 && cleanDeclRg !== cleanFedRg;
              const isEmissorDiff = federada.rgOrgaoEmissor && declaracao.rgOrgaoEmissor.trim().toUpperCase() !== federada.rgOrgaoEmissor.trim().toUpperCase();

              return (
                <CompareRow
                  label="Documento de Identidade (RG)"
                  field="rg"
                  status={getFieldStatus('rg')}
                  divergenceNote={
                    isRgDiff ? (
                      <span className="text-[10px] text-rose-300 flex items-center space-x-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Número do RG divergente entre a declaração e o assento civil federado.</span>
                      </span>
                    ) : isEmissorDiff ? (
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-rose-300 flex items-center space-x-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Órgão emissor diverge: Declarado '{declaracao.rgOrgaoEmissor || 'Vazio'}' vs Base Federada '{federada.rgOrgaoEmissor}'.</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateDeclaracaoField('rgOrgaoEmissor', federada.rgOrgaoEmissor)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono flex items-center space-x-1"
                          title="Copiar órgão emissor da base oficial"
                        >
                          <span>Aplicar: {federada.rgOrgaoEmissor}</span>
                        </button>
                      </div>
                    ) : undefined
                  }
                  col1={
                    <div className="flex space-x-1">
                      <input
                        type="text"
                        value={declaracao.rg}
                        onChange={(e) => onUpdateDeclaracaoField('rg', e.target.value)}
                        className={`w-2/3 rounded px-2 py-1 text-xs font-mono focus:outline-none ${
                          isRgDiff 
                            ? 'bg-rose-950/40 border border-rose-500 text-rose-100 ring-1 ring-rose-500' 
                            : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={declaracao.rgOrgaoEmissor}
                        onChange={(e) => onUpdateDeclaracaoField('rgOrgaoEmissor', e.target.value)}
                        placeholder="SSP/UF"
                        className={`w-1/3 rounded px-1 py-1 text-[11px] uppercase text-center font-bold focus:outline-none ${
                          isEmissorDiff
                            ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500'
                            : 'bg-slate-950 border border-slate-700 text-white'
                        }`}
                      />
                    </div>
                  }
                  col2={
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-200">
                        <DiffHighlight 
                          current={`${ocr.rg}${ocr.rgOrgaoEmissor ? ` (${ocr.rgOrgaoEmissor})` : ''}`} 
                          reference={`${declaracao.rg}${declaracao.rgOrgaoEmissor ? ` (${declaracao.rgOrgaoEmissor})` : ''}`} 
                        />
                      </span>
                      {renderOCRConfidenceBadge(ocrConfidence.rg, 'rg')}
                    </div>
                  }
                  col3={
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-cyan-300">
                        <DiffHighlight 
                          current={`${federada.rg}${federada.rgOrgaoEmissor ? ` (${federada.rgOrgaoEmissor})` : ''}`} 
                          reference={`${declaracao.rg}${declaracao.rgOrgaoEmissor ? ` (${declaracao.rgOrgaoEmissor})` : ''}`} 
                        />
                      </span>
                      <CopyAction
                        onCopy={() => {
                          onCopyFromFederada('rg');
                          onCopyFromFederada('rgOrgaoEmissor');
                        }}
                        title="Copiar RG e Órgão Emissor da base oficial"
                      />
                    </div>
                  }
                />
              );
            })()}

            {/* ROW: Sexo e Cor/Raça */}
            <CompareRow
              label="Sexo & Cor/Raça"
              field="sexo"
              status={getFieldStatus('sexo')}
              col1={
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <select
                    value={declaracao.sexo}
                    onChange={(e) => onUpdateDeclaracaoField('sexo', e.target.value)}
                    className={`rounded px-1.5 py-1 text-xs ${
                      getFieldStatus('sexo').hasDivergence 
                        ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500' 
                        : 'bg-slate-950 border border-slate-700 text-white'
                    }`}
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Feminino (F)</option>
                    <option value="I">Ignorado</option>
                  </select>
                  <select
                    value={declaracao.corRaca}
                    onChange={(e) => onUpdateDeclaracaoField('corRaca', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white text-xs"
                  >
                    <option value="BRANCA">Branca</option>
                    <option value="PRETA">Preta</option>
                    <option value="PARDA">Parda</option>
                    <option value="AMARELA">Amarela</option>
                    <option value="INDIGENA">Indígena</option>
                  </select>
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    <DiffHighlight current={ocr.sexo === 'M' ? 'Masc.' : 'Fem.'} reference={declaracao.sexo === 'M' ? 'Masc.' : 'Fem.'} /> | {ocr.corRaca}
                  </span>
                  {renderOCRConfidenceBadge(ocrConfidence.sexo, 'sexo')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300">
                    <DiffHighlight current={federada.sexo === 'M' ? 'Masc.' : 'Fem.'} reference={declaracao.sexo === 'M' ? 'Masc.' : 'Fem.'} /> | {federada.corRaca}
                  </span>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('sexo');
                      onCopyFromFederada('corRaca');
                    }}
                    title="Copiar da base central"
                  />
                </div>
              }
            />

          </div>
        </div>

        {/* SECTION: CRONOLOGIA VITAL & ESTADO CIVIL */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800/70 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Cronologia Vital & Histórico Matrimonial</span>
            </div>
            <span className="text-[10px] text-slate-400">Quality Gate: Nascimento &lt; Casamento &lt; Óbito</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* ROW: Data de Nascimento */}
            <CompareRow
              label="Data de Nascimento"
              field="dataNascimento"
              status={getFieldStatus('dataNascimento')}
              divergenceNote={
                getFieldStatus('dataNascimento').hasDivergence ? (
                  <span className="text-[10px] text-rose-300">Divergência na data de nascimento. Parte divergente destacada em vermelho.</span>
                ) : undefined
              }
              col1={
                <input
                  type="date"
                  value={declaracao.dataNascimento}
                  onChange={(e) => onUpdateDeclaracaoField('dataNascimento', e.target.value)}
                  className={`w-full rounded px-2 py-1 text-xs font-mono focus:outline-none ${
                    getFieldStatus('dataNascimento').hasDivergence 
                      ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/60' 
                      : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                  }`}
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200">
                    <DiffHighlight current={ocr.dataNascimento} reference={declaracao.dataNascimento} />
                  </span>
                  {renderOCRConfidenceBadge(ocrConfidence.dataNascimento, 'dataNascimento')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300 font-semibold">
                    <DiffHighlight current={federada.dataNascimento} reference={declaracao.dataNascimento} />
                  </span>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('dataNascimento')}
                    title="Usar data de nascimento do assento originário"
                  />
                </div>
              }
            />

            {/* ROW: Data e Hora do Óbito */}
            <CompareRow
              label="Data & Hora do Falecimento"
              field="dataObito"
              status={getFieldStatus('dataObito')}
              col1={
                <div className="flex space-x-1">
                  <input
                    type="date"
                    value={declaracao.dataObito}
                    onChange={(e) => onUpdateDeclaracaoField('dataObito', e.target.value)}
                    className={`w-2/3 rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none ${
                      getFieldStatus('dataObito').hasDivergence 
                        ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/60' 
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                    }`}
                  />
                  <input
                    type="time"
                    value={declaracao.horaObito}
                    onChange={(e) => onUpdateDeclaracaoField('horaObito', e.target.value)}
                    className="w-1/3 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white font-mono"
                  />
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200 font-bold">
                    <DiffHighlight current={ocr.dataObito} reference={declaracao.dataObito} /> às {ocr.horaObito}
                  </span>
                  {renderOCRConfidenceBadge(ocrConfidence.dataObito, 'dataObito')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300">
                    <DiffHighlight current={federada.dataObito} reference={declaracao.dataObito} /> ({federada.horaObito})
                  </span>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('dataObito');
                      onCopyFromFederada('horaObito');
                    }}
                    title="Copiar data e hora do óbito"
                  />
                </div>
              }
            />

            {/* ROW: Estado Civil */}
            <CompareRow
              label="Estado Civil"
              field="estadoCivil"
              status={getFieldStatus('estadoCivil')}
              col1={
                <select
                  value={declaracao.estadoCivil}
                  onChange={(e) => onUpdateDeclaracaoField('estadoCivil', e.target.value)}
                  className={`w-full rounded px-2 py-1 text-xs font-semibold focus:outline-none ${
                    getFieldStatus('estadoCivil').hasDivergence 
                      ? 'bg-rose-950/40 border border-rose-500 text-rose-100 ring-1 ring-rose-500/70' 
                      : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                  }`}
                >
                  <option value="SOLTEIRO">SOLTEIRO(A)</option>
                  <option value="CASADO">CASADO(A)</option>
                  <option value="VIUVO">VIÚVO(A)</option>
                  <option value="DIVORCIADO">DIVORCIADO(A)</option>
                  <option value="SEPARADO_JUDICIALMENTE">SEPARADO(A) JUDICIALMENTE</option>
                </select>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    <DiffHighlight current={ocr.estadoCivil} reference={declaracao.estadoCivil} />
                  </span>
                  {renderOCRConfidenceBadge(ocrConfidence.estadoCivil, 'estadoCivil')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300">
                    <DiffHighlight current={federada.estadoCivil} reference={declaracao.estadoCivil} />
                  </span>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('estadoCivil')}
                    title="Copiar estado civil da CRC Central"
                  />
                </div>
              }
            />

            {/* ROW: Data Casamento & Cônjuge */}
            {(declaracao.estadoCivil === 'CASADO' || declaracao.estadoCivil === 'VIUVO' || declaracao.estadoCivil === 'DIVORCIADO' || federada.estadoCivil === 'CASADO') && (
              <CompareRow
                label="Data do Casamento / Cônjuge"
                field="dataCasamento"
                status={getFieldStatus('dataCasamento')}
                col1={
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={declaracao.dataCasamento || ''}
                      onChange={(e) => onUpdateDeclaracaoField('dataCasamento', e.target.value)}
                      className={`w-full rounded px-2 py-1 text-xs font-mono focus:outline-none ${
                        getFieldStatus('dataCasamento').hasDivergence 
                          ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/50' 
                          : 'bg-slate-950 border border-slate-700 text-white'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Nome do cônjuge / companheiro"
                      value={declaracao.nomeConjuge || ''}
                      onChange={(e) => onUpdateDeclaracaoField('nomeConjuge', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase font-medium"
                    />
                  </div>
                }
                col2={
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-200">
                        <DiffHighlight current={ocr.dataCasamento || 'Não anotado'} reference={declaracao.dataCasamento || ''} />
                      </span>
                      {renderOCRConfidenceBadge(ocrConfidence.dataCasamento, 'dataCasamento')}
                    </div>
                    <div className="text-slate-300 uppercase truncate">
                      <DiffHighlight current={ocr.nomeConjuge || '---'} reference={declaracao.nomeConjuge || ''} />
                    </div>
                  </div>
                }
                col3={
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-300 font-bold">
                        <DiffHighlight current={federada.dataCasamento || 'Sem assento'} reference={declaracao.dataCasamento || ''} />
                      </span>
                      <CopyAction
                        onCopy={() => {
                          onCopyFromFederada('dataCasamento');
                          onCopyFromFederada('nomeConjuge');
                        }}
                        title="Copiar dados do Livro B (Casamento)"
                      />
                    </div>
                    <div className="text-cyan-300 font-semibold uppercase truncate">
                      <DiffHighlight current={federada.nomeConjuge || '---'} reference={declaracao.nomeConjuge || ''} />
                    </div>
                  </div>
                }
              />
            )}
          </div>
        </div>

        {/* SECTION: FILIAÇÃO MATERNA & PATERNA */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800/70 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <HeartCrack className="w-3.5 h-3.5 text-rose-400" />
              <span>Filiação (CrossCheck Genitores)</span>
            </div>
            <span className="text-[10px] text-slate-400">Verificação com Livro A (Nascimento)</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* ROW: Nome da Mãe */}
            <CompareRow
              label="Filiação Materna (Nome da Mãe)"
              field="nomeMae"
              status={getFieldStatus('nomeMae')}
              divergenceNote={
                getFieldStatus('nomeMae').hasDivergence ? (
                  <span className="text-[10px] text-rose-300">
                    Divergência no nome materno confrontado com o assento originário. Partes divergentes em vermelho.
                  </span>
                ) : undefined
              }
              col1={
                <input
                  type="text"
                  value={declaracao.nomeMae}
                  onChange={(e) => onUpdateDeclaracaoField('nomeMae', e.target.value)}
                  className={`w-full rounded px-2 py-1 text-xs uppercase font-medium focus:outline-none ${
                    getFieldStatus('nomeMae').hasDivergence 
                      ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/60 font-bold' 
                      : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                  }`}
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-200 uppercase truncate max-w-[200px]">
                    <DiffHighlight current={ocr.nomeMae} reference={declaracao.nomeMae} />
                  </div>
                  {renderOCRConfidenceBadge(ocrConfidence.nomeMae, 'nomeMae')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div className="text-cyan-300 font-bold uppercase truncate max-w-[200px]">
                    <DiffHighlight current={federada.nomeMae} reference={declaracao.nomeMae} />
                  </div>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('nomeMae')}
                    title="Copiar nome materno da base central"
                  />
                </div>
              }
            />

            {/* ROW: Nome do Pai */}
            <CompareRow
              label="Filiação Paterna (Nome do Pai)"
              field="nomePai"
              status={getFieldStatus('nomePai')}
              col1={
                <input
                  type="text"
                  value={declaracao.nomePai}
                  onChange={(e) => onUpdateDeclaracaoField('nomePai', e.target.value)}
                  className={`w-full rounded px-2 py-1 text-xs uppercase font-medium focus:outline-none ${
                    getFieldStatus('nomePai').hasDivergence 
                      ? 'bg-rose-950/30 border border-rose-500 text-rose-100 ring-1 ring-rose-500/60' 
                      : 'bg-slate-950 border border-slate-700 text-white focus:border-indigo-500'
                  }`}
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-200 uppercase truncate max-w-[200px]">
                    <DiffHighlight current={ocr.nomePai} reference={declaracao.nomePai} />
                  </div>
                  {renderOCRConfidenceBadge(ocrConfidence.nomePai, 'nomePai')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div className="text-cyan-300 font-bold uppercase truncate max-w-[200px]">
                    <DiffHighlight current={federada.nomePai} reference={declaracao.nomePai} />
                  </div>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('nomePai')}
                    title="Copiar nome paterno da base central"
                  />
                </div>
              }
            />
          </div>
        </div>

        {/* SECTION: MÉDICO-LEGAL & CAUSA DA MORTE */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800/70 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atestado Médico & Causa Mortis</span>
            </div>
            <span className="text-[10px] text-slate-400">Art. 77 Lei 6.015/73 / CFM</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* ROW: Causa Mortis */}
            <CompareRow
              label="Causa Mortis (Causa Jurídica/Clínica)"
              field="causaMortis"
              status={getFieldStatus('causaMortis')}
              col1={
                <div className="space-y-1">
                  <textarea
                    rows={2}
                    value={declaracao.causaMortis}
                    onChange={(e) => onUpdateDeclaracaoField('causaMortis', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400">CID-10:</span>
                    <input
                      type="text"
                      value={declaracao.cid10}
                      onChange={(e) => onUpdateDeclaracaoField('cid10', e.target.value)}
                      placeholder="CID-10"
                      className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono text-center uppercase"
                    />
                  </div>
                </div>
              }
              col2={
                <div className="space-y-1 text-xs">
                  <div className="text-slate-200 text-xs italic">
                    <DiffHighlight current={ocr.causaMortis} reference={declaracao.causaMortis} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-400">
                      CID: <DiffHighlight current={ocr.cid10} reference={declaracao.cid10} />
                    </span>
                    {renderOCRConfidenceBadge(ocrConfidence.causaMortis, 'causaMortis')}
                  </div>
                </div>
              }
              col3={
                <div className="space-y-1 text-xs">
                  <div className="text-cyan-300 text-xs">
                    <DiffHighlight current={federada.causaMortis} reference={declaracao.causaMortis} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-cyan-400">
                      CID: <DiffHighlight current={federada.cid10} reference={declaracao.cid10} />
                    </span>
                    <CopyAction
                      onCopy={() => {
                        onCopyFromFederada('causaMortis');
                        onCopyFromFederada('cid10');
                      }}
                      title="Copiar causa mortis do sistema de saúde"
                    />
                  </div>
                </div>
              }
            />

            {/* ROW: Médico Atestante & CRM */}
            <CompareRow
              label="Médico Atestante (CRM/UF)"
              field="crmMedico"
              status={getFieldStatus('crmMedico')}
              col1={
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="text"
                    placeholder="Nome do Médico"
                    value={declaracao.nomeMedico}
                    onChange={(e) => onUpdateDeclaracaoField('nomeMedico', e.target.value)}
                    className="col-span-2 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      placeholder="CRM"
                      value={declaracao.crmMedico}
                      onChange={(e) => onUpdateDeclaracaoField('crmMedico', e.target.value)}
                      className={`w-2/3 rounded px-1 py-1 text-xs font-mono text-center font-bold focus:outline-none ${
                        getFieldStatus('crmMedico').hasDivergence 
                          ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500' 
                          : 'bg-slate-950 border border-slate-700 text-white'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      value={declaracao.ufCrm}
                      onChange={(e) => onUpdateDeclaracaoField('ufCrm', e.target.value)}
                      className="w-1/3 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-white uppercase text-center"
                    />
                  </div>
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-200">
                      <DiffHighlight current={ocr.nomeMedico} reference={declaracao.nomeMedico} />
                    </div>
                    <div className="font-mono font-bold text-amber-300">
                      CRM <DiffHighlight current={ocr.crmMedico} reference={declaracao.crmMedico} />/{ocr.ufCrm}
                    </div>
                  </div>
                  {renderOCRConfidenceBadge(ocrConfidence.crmMedico, 'crmMedico')}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">
                      <DiffHighlight current={federada.nomeMedico} reference={declaracao.nomeMedico} />
                    </div>
                    <div className="font-mono font-bold text-cyan-400">
                      CRM <DiffHighlight current={federada.crmMedico} reference={declaracao.crmMedico} />/{federada.ufCrm}
                    </div>
                  </div>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('nomeMedico');
                      onCopyFromFederada('crmMedico');
                      onCopyFromFederada('ufCrm');
                    }}
                    title="Copiar identificação médica do CFM"
                  />
                </div>
              }
            />

            {/* ROW: Local do Óbito */}
            <CompareRow
              label="Local do Óbito & Município"
              field="localObito"
              status={getFieldStatus('localObito')}
              col1={
                <div className="space-y-1">
                  <input
                    type="text"
                    value={declaracao.localObito}
                    onChange={(e) => onUpdateDeclaracaoField('localObito', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      value={declaracao.municipioObito}
                      onChange={(e) => onUpdateDeclaracaoField('municipioObito', e.target.value)}
                      className="w-3/4 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={declaracao.ufObito}
                      onChange={(e) => onUpdateDeclaracaoField('ufObito', e.target.value)}
                      className="w-1/4 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white uppercase text-center font-bold"
                    />
                  </div>
                </div>
              }
              col2={
                <div className="text-xs space-y-0.5">
                  <div className="text-slate-200">
                    <DiffHighlight current={ocr.localObito} reference={declaracao.localObito} />
                  </div>
                  <div className="text-slate-400">
                    <DiffHighlight current={ocr.municipioObito} reference={declaracao.municipioObito} />/{ocr.ufObito}
                  </div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">
                      <DiffHighlight current={federada.localObito} reference={declaracao.localObito} />
                    </div>
                    <div className="text-cyan-400 font-semibold">
                      <DiffHighlight current={federada.municipioObito} reference={declaracao.municipioObito} />/{federada.ufObito}
                    </div>
                  </div>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('localObito');
                      onCopyFromFederada('municipioObito');
                      onCopyFromFederada('ufObito');
                    }}
                    title="Copiar dados geográficos"
                  />
                </div>
              }
            />
          </div>
        </div>

        {/* SECTION: DESTINAÇÃO DO CORPO, BENS, HERDEIROS E DECLARANTE */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800/70 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sepultamento, Bens, Filhos e Declarante</span>
            </div>
            <span className="text-[10px] text-slate-400">Qualificação Obrigatória</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* ROW: Sepultamento ou Cremação */}
            <CompareRow
              label="Sepultamento / Cremação & Local"
              field="sepultamentoCremacao"
              status={getFieldStatus('sepultamentoCremacao')}
              col1={
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={declaracao.sepultamentoCremacao}
                      onChange={(e) => onUpdateDeclaracaoField('sepultamentoCremacao', e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                    >
                      <option value="SEPULTAMENTO">SEPULTAMENTO</option>
                      <option value="CREMACAO">CREMAÇÃO</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome do Cemitério ou Crematório"
                    value={declaracao.cemiterio}
                    onChange={(e) => onUpdateDeclaracaoField('cemiterio', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              }
              col2={
                <div className="text-xs">
                  <div className="text-slate-200">
                    <DiffHighlight current={ocr.sepultamentoCremacao} reference={declaracao.sepultamentoCremacao} />
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    <DiffHighlight current={ocr.cemiterio} reference={declaracao.cemiterio} />
                  </div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">
                      <DiffHighlight current={federada.sepultamentoCremacao} reference={declaracao.sepultamentoCremacao} />
                    </div>
                    <div className="text-cyan-400 text-[11px]">
                      <DiffHighlight current={federada.cemiterio} reference={declaracao.cemiterio} />
                    </div>
                  </div>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('sepultamentoCremacao');
                      onCopyFromFederada('cemiterio');
                    }}
                    title="Copiar dados do sepultamento"
                  />
                </div>
              }
            />

            {/* ROW: Bens e Filhos */}
            <CompareRow
              label="Deixou Bens & Deixou Filhos"
              field="deixouBens"
              status={getFieldStatus('deixouBens')}
              col1={
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Deixou Bens?</label>
                      <select
                        value={declaracao.deixouBens}
                        onChange={(e) => onUpdateDeclaracaoField('deixouBens', e.target.value)}
                        className={`w-full rounded px-1.5 py-1 text-white text-xs ${
                          declaracao.deixouBens !== federada.deixouBens 
                            ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500' 
                            : 'bg-slate-950 border border-slate-700'
                        }`}
                      >
                        <option value="SIM">SIM</option>
                        <option value="NAO">NÃO</option>
                        <option value="IGNORADO">IGNORADO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Deixou Filhos?</label>
                      <select
                        value={declaracao.deixouFilhos}
                        onChange={(e) => onUpdateDeclaracaoField('deixouFilhos', e.target.value)}
                        className={`w-full rounded px-1.5 py-1 text-white text-xs ${
                          declaracao.deixouFilhos !== federada.deixouFilhos 
                            ? 'bg-rose-950/40 border border-rose-500 text-rose-200 ring-1 ring-rose-500' 
                            : 'bg-slate-950 border border-slate-700'
                        }`}
                      >
                        <option value="SIM">SIM</option>
                        <option value="NAO">NÃO</option>
                        <option value="IGNORADO">IGNORADO</option>
                      </select>
                    </div>
                  </div>
                  {declaracao.deixouFilhos === 'SIM' && (
                    <input
                      type="text"
                      placeholder="Nomes dos filhos (ex: Lucas, Camila)"
                      value={declaracao.nomesFilhos || ''}
                      onChange={(e) => onUpdateDeclaracaoField('nomesFilhos', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  )}
                </div>
              }
              col2={
                <div className="text-xs space-y-0.5">
                  <div className="text-slate-300">
                    Bens: <DiffHighlight current={ocr.deixouBens} reference={declaracao.deixouBens} /> | Filhos: <DiffHighlight current={ocr.deixouFilhos} reference={declaracao.deixouFilhos} />
                  </div>
                  {ocr.nomesFilhos && (
                    <div className="text-slate-400 text-[11px] truncate">
                      <DiffHighlight current={ocr.nomesFilhos} reference={declaracao.nomesFilhos || ''} />
                    </div>
                  )}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="text-cyan-300">
                      Bens: <DiffHighlight current={federada.deixouBens} reference={declaracao.deixouBens} /> | Filhos: <DiffHighlight current={federada.deixouFilhos} reference={declaracao.deixouFilhos} />
                    </div>
                    {federada.nomesFilhos && (
                      <div className="text-cyan-400 text-[11px] truncate">
                        <DiffHighlight current={federada.nomesFilhos} reference={declaracao.nomesFilhos || ''} />
                      </div>
                    )}
                  </div>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('deixouBens');
                      onCopyFromFederada('deixouFilhos');
                      onCopyFromFederada('nomesFilhos');
                    }}
                    title="Copiar dados patrimoniais e de sucessão"
                  />
                </div>
              }
            />

            {/* ROW: Declarante */}
            <CompareRow
              label="Identificação do Declarante"
              field="nomeDeclarante"
              status={getFieldStatus('nomeDeclarante')}
              col1={
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    placeholder="Nome do declarante"
                    value={declaracao.nomeDeclarante}
                    onChange={(e) => onUpdateDeclaracaoField('nomeDeclarante', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Qualificação (ex: Filho, Cônjuge)"
                    value={declaracao.qualificacaoDeclarante}
                    onChange={(e) => onUpdateDeclaracaoField('qualificacaoDeclarante', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              }
              col2={
                <div className="text-xs">
                  <div className="text-slate-200 uppercase">
                    <DiffHighlight current={ocr.nomeDeclarante} reference={declaracao.nomeDeclarante} />
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    <DiffHighlight current={ocr.qualificacaoDeclarante} reference={declaracao.qualificacaoDeclarante} />
                  </div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300 uppercase">
                      <DiffHighlight current={federada.nomeDeclarante} reference={declaracao.nomeDeclarante} />
                    </div>
                    <div className="text-cyan-400 text-[11px]">
                      <DiffHighlight current={federada.qualificacaoDeclarante} reference={declaracao.qualificacaoDeclarante} />
                    </div>
                  </div>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('nomeDeclarante');
                      onCopyFromFederada('qualificacaoDeclarante');
                    }}
                    title="Copiar qualificação do declarante"
                  />
                </div>
              }
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper row component
interface CompareRowProps {
  label: string;
  field: string;
  status: { status: string; label: string; color: string; hasDivergence?: boolean };
  divergenceNote?: React.ReactNode;
  col1: React.ReactNode;
  col2: React.ReactNode;
  col3: React.ReactNode;
}

const CompareRow: React.FC<CompareRowProps> = ({ label, status, divergenceNote, col1, col2, col3 }) => {
  const isDivergent = status.hasDivergence;

  return (
    <div className={`px-3 py-2 transition-colors ${
      isDivergent 
        ? 'bg-rose-950/15 border-l-2 border-l-rose-500 hover:bg-rose-950/25' 
        : 'hover:bg-slate-800/40'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1.5">
          {isDivergent && (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className={`text-[11px] font-semibold ${isDivergent ? 'text-rose-200' : 'text-slate-400'}`}>
            {label}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
        <div className="pr-1">{col1}</div>
        <div className={`px-2 py-1 rounded border min-h-[32px] flex items-center ${
          isDivergent ? 'bg-slate-950 border-rose-900/50' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="w-full">{col2}</div>
        </div>
        <div className={`px-2 py-1 rounded border min-h-[32px] flex items-center ${
          isDivergent ? 'bg-slate-950 border-rose-900/50' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="w-full">{col3}</div>
        </div>
      </div>

      {divergenceNote && (
        <div className="mt-1 pl-1">
          {divergenceNote}
        </div>
      )}
    </div>
  );
};

// Copy button component
const CopyAction: React.FC<{ onCopy: () => void; title: string }> = ({ onCopy, title }) => (
  <button
    type="button"
    onClick={onCopy}
    title={title}
    className="ml-1 p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors shrink-0"
  >
    <Copy className="w-3 h-3" />
  </button>
);
