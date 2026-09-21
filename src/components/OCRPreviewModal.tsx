import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Scan, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  ShieldCheck, 
  Layers, 
  FileText, 
  Target,
  Search,
  Maximize2,
  Info,
  Compass,
  FileWarning,
  Sparkles
} from 'lucide-react';
import { 
  DeathRecordData, 
  OCRConfidenceMap, 
  OCRDocumentState, 
  OCRFieldExtraction, 
  OCRBoundingBox 
} from '../types';

interface OCRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentState: OCRDocumentState;
  ocrData: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
  focusedField?: keyof DeathRecordData | null;
  onSelectField?: (field: keyof DeathRecordData) => void;
}

export const OCRPreviewModal: React.FC<OCRPreviewModalProps> = ({
  isOpen,
  onClose,
  documentState,
  ocrData,
  ocrConfidence,
  focusedField: initialFocusedField,
  onSelectField
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [activeField, setActiveField] = useState<keyof DeathRecordData | null>(initialFocusedField || 'nomeFalecido');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Captura dinâmica das dimensões nativas da imagem carregada (naturalWidth e naturalHeight)
  const [imageDimensions, setImageDimensions] = useState<{
    naturalWidth: number;
    naturalHeight: number;
  }>({
    naturalWidth: documentState.imageDimensions?.naturalWidth || 0,
    naturalHeight: documentState.imageDimensions?.naturalHeight || 0
  });

  const documentContainerRef = useRef<HTMLDivElement>(null);
  const focusedBoxRef = useRef<HTMLDivElement>(null);
  const entityItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sincronizar foco inicial ao abrir modal ou trocar de prop
  useEffect(() => {
    if (initialFocusedField) {
      setActiveField(initialFocusedField);
    }
  }, [initialFocusedField, isOpen]);

  // Se o documentState já tiver dimensões conhecidas, sincronizar
  useEffect(() => {
    if (documentState.imageDimensions?.naturalWidth && documentState.imageDimensions?.naturalHeight) {
      setImageDimensions(documentState.imageDimensions);
    }
  }, [documentState.imageDimensions]);

  // Captura dinâmica de naturalWidth e naturalHeight via evento onLoad da tag <img>
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 1200;
    const nh = img.naturalHeight || 1650;
    setImageDimensions({
      naturalWidth: nw,
      naturalHeight: nh
    });
  };

  // Rolagem suave e centralização da caixa ativa na imagem
  useEffect(() => {
    if (isOpen && activeField && focusedBoxRef.current && documentContainerRef.current) {
      const timer = setTimeout(() => {
        focusedBoxRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [activeField, isOpen, zoomLevel]);

  // Rolagem suave da lista lateral de entidades quando o campo ativo mudar
  useEffect(() => {
    if (activeField && entityItemRefs.current[activeField]) {
      entityItemRefs.current[activeField]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeField]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);

  // Cálculo dinâmico de coordenadas relativas normalizadas (left, top, width, height)
  // Convertendo os píxeis absolutos devolvidos pelo motor de OCR sobre as dimensões reais da imagem
  const getNormalizedCoords = (bbox: OCRBoundingBox) => {
    if (
      bbox.pixelX0 !== undefined &&
      bbox.pixelY0 !== undefined &&
      bbox.pixelX1 !== undefined &&
      bbox.pixelY1 !== undefined &&
      imageDimensions.naturalWidth > 0 &&
      imageDimensions.naturalHeight > 0
    ) {
      const left = (bbox.pixelX0 / imageDimensions.naturalWidth) * 100;
      const top = (bbox.pixelY0 / imageDimensions.naturalHeight) * 100;
      const width = ((bbox.pixelX1 - bbox.pixelX0) / imageDimensions.naturalWidth) * 100;
      const height = ((bbox.pixelY1 - bbox.pixelY0) / imageDimensions.naturalHeight) * 100;
      return { left, top, width, height };
    }

    // Fallback relativo seguro
    return {
      left: bbox.x,
      top: bbox.y,
      width: bbox.w,
      height: bbox.h
    };
  };

  // Cores de confiança óptica
  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-950/80 border-emerald-600';
    if (score >= 70) return 'text-amber-300 bg-amber-950/80 border-amber-600';
    return 'text-rose-400 bg-rose-950/80 border-rose-600';
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-600 text-white';
    if (score >= 70) return 'bg-amber-600 text-white';
    return 'bg-rose-600 text-white';
  };

  // Lista de campos estritamente obtida a partir do documento processado no momento
  const fieldsList: OCRFieldExtraction[] = Object.values(documentState.fields || {}).filter(
    (item): item is OCRFieldExtraction => !!item
  );

  const filteredFields = fieldsList.filter(f => 
    f.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.value.toLowerCase().includes(searchFilter.toLowerCase()) ||
    String(f.field).toLowerCase().includes(searchFilter.toLowerCase())
  );

  const activeFieldData = activeField ? documentState.fields?.[activeField] : null;
  const classification = documentState.classification;
  const warningBanner = classification?.warningBanner;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-3 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">
                  Visualizador Óptico de Bounding Boxes
                </h2>
                {classification ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 border ${
                    classification.isCompatibleDO 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' 
                      : 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse'
                  }`}>
                    {classification.isCompatibleDO ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-1" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-rose-400 inline mr-1" />
                    )}
                    <span>{classification.typeName}</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                    Análise On-Device
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                <span>Arquivo: <strong className="text-slate-200">{documentState.fileName}</strong></span>
                <span>•</span>
                <span>Resolução Nativa: <strong className="text-slate-200 font-mono">{imageDimensions.naturalWidth} × {imageDimensions.naturalHeight} px</strong></span>
                <span>•</span>
                <span className="text-cyan-400 font-mono text-[11px]">{fieldsList.length} entidades mapeadas</span>
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reduzir Zoom (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] select-none text-slate-200">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors border-l border-slate-700 cursor-pointer"
                title="Ajustar ao tamanho padrão (100%)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                showBoundingBoxes 
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Alternar visibilidade das caixas de delimitação óptica"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bounding Boxes</span>
            </button>

            <button
              id="btn-close-ocr-preview-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              title="Fechar Visualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. BANNER DE AVISO DO CLASSIFICADOR PRÉVIO DE TIPO DE DOCUMENTO */}
        {warningBanner && (
          <div className={`px-4 py-2.5 border-b flex items-start space-x-3 shrink-0 ${
            warningBanner.severity === 'BLOQUEIO'
              ? 'bg-rose-950/70 border-rose-800 text-rose-100'
              : 'bg-amber-950/70 border-amber-800 text-amber-100'
          }`}>
            <div className={`p-1 rounded mt-0.5 shrink-0 ${
              warningBanner.severity === 'BLOQUEIO' ? 'bg-rose-900 text-rose-300' : 'bg-amber-900 text-amber-300'
            }`}>
              <FileWarning className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold flex items-center space-x-2">
                <span>{warningBanner.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider bg-black/40 border border-white/20">
                  {warningBanner.severity}
                </span>
              </div>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                {warningBanner.message}
              </p>
              <p className="mt-1 font-semibold underline decoration-white/30">
                Orientação Registral: {warningBanner.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Main Body: Document Viewport + Entities Side Inspector */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Document Viewport com pan e scroll smooth */}
          <div 
            ref={documentContainerRef}
            className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-6 flex justify-center items-start relative select-none scroll-smooth"
          >
            {/* 1. WRAPPER RELATIVO ESTRITO ENCAPSULANDO A IMAGEM E O OVERLAY */}
            <div 
              className="relative inline-block transition-transform duration-150 origin-top shadow-2xl rounded-sm border border-slate-700 select-none overflow-hidden"
              style={{
                width: `${(zoomLevel / 100) * 820}px`,
                maxWidth: 'none'
              }}
            >
              {/* Imagem Original Carregada - onLoad captura dimensões nativas */}
              <img 
                src={documentState.imageUrl} 
                alt="Documento Original Escaneado"
                onLoad={handleImageLoad}
                className="w-full h-auto block pointer-events-none select-none"
              />

              {/* CAMADA DE SOBREPOSIÇÃO ABSOLUTA (INSET-0) ESTREITAMENTE CONTIDA NO MESMO WRAPPER */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                {showBoundingBoxes && fieldsList.map((extraction) => {
                  const isSelected = activeField === extraction.field;
                  // Cálculo dinâmico das coordenadas percentuais normalizadas sobre as dimensões nativas
                  const { left, top, width, height } = getNormalizedCoords(extraction.bbox);

                  // Evitar renderizar caixas zeradas ou inválidas
                  if (width <= 0 || height <= 0) return null;

                  return (
                    <div
                      key={extraction.field}
                      ref={isSelected ? focusedBoxRef : null}
                      onClick={() => {
                        setActiveField(extraction.field);
                        onSelectField?.(extraction.field);
                      }}
                      className={`absolute cursor-pointer pointer-events-auto transition-all duration-150 group ${
                        isSelected
                          ? 'border-2 border-cyan-400 bg-cyan-400/30 shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-300 animate-pulse z-30'
                          : 'border border-dashed border-amber-500/90 bg-amber-500/15 hover:bg-amber-400/25 hover:border-amber-300 z-10'
                      }`}
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        borderRadius: '2px'
                      }}
                      title={`${extraction.label}: ${extraction.value || 'Não detectado'} (OCR: ${extraction.confidence}%)`}
                    >
                      {/* Bounding Box Label Tag */}
                      <div className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-none ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 ring-1 ring-cyan-200 z-40'
                          : `${getConfidenceBadgeColor(extraction.confidence)} opacity-85 group-hover:opacity-100`
                      }`}>
                        {extraction.label}: {extraction.confidence}%
                      </div>

                      {/* Selected Field Indicator Beacon com detalhes espaciais */}
                      {isSelected && (
                        <div className="absolute -bottom-6 left-0 bg-slate-900/95 border border-cyan-400 text-cyan-200 px-2 py-0.5 rounded text-[10px] shadow-xl z-40 whitespace-nowrap font-sans font-medium flex items-center space-x-1.5">
                          <Target className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>"{extraction.value || 'Não detectado'}"</span>
                          {extraction.bbox.pixelX0 !== undefined && (
                            <span className="text-[9px] text-cyan-400/70 font-mono">
                              [px: {extraction.bbox.pixelX0},{extraction.bbox.pixelY0}]
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Right: Extracted Entities Inspector Panel (Sincronizado Estritamente) */}
          <div className="w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
            
            {/* Inspector Header & Search */}
            <div className="p-3.5 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Entidades Mapeadas ({fieldsList.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {documentState.timestamp || 'Sincronizado'}
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Pesquisar entidade ou valor..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Currently Focused Entity Spotlight */}
            {activeFieldData && (
              <div className="p-3 bg-cyan-950/30 border-b border-cyan-900/50">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center space-x-1 mb-1">
                  <Target className="w-3 h-3 text-cyan-400" />
                  <span>Trecho em Foco na Imagem:</span>
                </div>
                <div className="text-xs font-bold text-white mb-0.5">
                  {activeFieldData.label}
                </div>
                <div className="font-mono text-xs bg-slate-950/80 border border-cyan-700/50 text-cyan-200 p-2 rounded break-all select-text">
                  "{activeFieldData.value || 'NÃO LOCALIZADO NO DOCUMENTO'}"
                </div>
                <div className="flex items-center justify-between text-[10px] mt-2 text-slate-400 font-mono">
                  <span>Confiança Óptica: <strong className={activeFieldData.confidence >= 85 ? 'text-emerald-400' : 'text-amber-400'}>{activeFieldData.confidence}%</strong></span>
                  <span>
                    {activeFieldData.bbox.pixelX0 !== undefined
                      ? `px: [${activeFieldData.bbox.pixelX0}, ${activeFieldData.bbox.pixelY0}]`
                      : `BBox: ${activeFieldData.bbox.x}%, ${activeFieldData.bbox.y}%`}
                  </span>
                </div>
              </div>
            )}

            {/* Scrollable Entities List - Sincronização Bidirecional */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/60">
              {filteredFields.map((fieldItem) => {
                const isSelected = activeField === fieldItem.field;
                const confColor = getConfidenceColor(fieldItem.confidence);
                const hasValue = !!fieldItem.value && fieldItem.value.trim().length > 0;

                return (
                  <div
                    key={fieldItem.field}
                    ref={(el) => { entityItemRefs.current[fieldItem.field] = el; }}
                    onClick={() => {
                      setActiveField(fieldItem.field);
                      onSelectField?.(fieldItem.field);
                    }}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/70 border border-indigo-500/80 ring-1 ring-indigo-500/40'
                        : 'hover:bg-slate-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                        <span>{fieldItem.label}</span>
                        {fieldItem.matchedAnchor && (
                          <span className="text-[9px] text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-1 rounded font-mono" title={`Âncora semântica: ${fieldItem.matchedAnchor}`}>
                            âncora
                          </span>
                        )}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono border font-bold ${confColor}`}>
                        {fieldItem.confidence}%
                      </span>
                    </div>

                    <div className="text-xs text-white font-medium break-words">
                      {hasValue ? (
                        fieldItem.value
                      ) : (
                        <span className="text-slate-500 italic flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-amber-500 inline mr-1" />
                          <span>Não detectado neste documento</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span>
                        {fieldItem.bbox.pixelX0 !== undefined
                          ? `px: [${fieldItem.bbox.pixelX0}, ${fieldItem.bbox.pixelY0}]`
                          : `x:${fieldItem.bbox.x}% y:${fieldItem.bbox.y}%`}
                      </span>
                      {isSelected ? (
                        <span className="text-cyan-400 flex items-center space-x-0.5">
                          <Eye className="w-3 h-3" />
                          <span>Destacado</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 hover:text-slate-300">Clique para focar</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredFields.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhum campo encontrado com o termo "{searchFilter}".
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-800/95 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>≥ 85% Alta Confiança</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>70% - 84% Confiança Média</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>&lt; 70% Conferência Manual</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">
              Conforme Provimento CNJ nº 149/2023 & LGPD On-Device
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors cursor-pointer border border-slate-600"
            >
              Fechar Visualizador
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
