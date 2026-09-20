import React from 'react';
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
  Award
} from 'lucide-react';
import { DeathRecordData, OCRConfidenceMap } from '../types';
import { normalizeName, nameSimilarity } from '../engine/validators';

interface ComparativePanelProps {
  declaracao: DeathRecordData;
  ocr: DeathRecordData;
  ocrConfidence: OCRConfidenceMap;
  federada: DeathRecordData;
  onUpdateDeclaracaoField: (field: keyof DeathRecordData, value: any) => void;
  onCopyFromFederada: (field: keyof DeathRecordData) => void;
  onCopyFromOCR: (field: keyof DeathRecordData) => void;
  onOpenOCRModal: () => void;
}

export const ComparativePanel: React.FC<ComparativePanelProps> = ({
  declaracao,
  ocr,
  ocrConfidence,
  federada,
  onUpdateDeclaracaoField,
  onCopyFromFederada,
  onCopyFromOCR,
  onOpenOCRModal
}) => {
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

    // Exact match
    if (hasFed && normDecl === normFed) {
      return { status: 'MATCH', label: 'Convergente', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60' };
    }

    // High similarity for names
    if (hasFed && (field === 'nomeFalecido' || field === 'nomeMae' || field === 'nomePai' || field === 'nomeConjuge')) {
      const sim = nameSimilarity(vDecl, vFed);
      if (sim >= 0.85) {
        return { status: 'SIMILAR', label: `Similar (${Math.round(sim * 100)}%)`, color: 'text-amber-400 bg-amber-950/40 border-amber-800/60' };
      }
    }

    // Inverted/mismatched critical field
    if (hasFed && normDecl !== normFed) {
      return { status: 'MISMATCH', label: 'Divergente', color: 'text-rose-400 bg-rose-950/40 border-rose-800/60' };
    }

    if (!hasFed && hasOcr && normDecl === normOcr) {
      return { status: 'MATCH_OCR', label: 'Bate com OCR', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60' };
    }

    return { status: 'NEUTRAL', label: 'Verificado', color: 'text-slate-400 bg-slate-800 border-slate-700' };
  };

  // Helper for OCR badge
  const renderOCRConfidenceBadge = (confidence?: number) => {
    const conf = confidence ?? 90;
    let badgeClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
    if (conf < 75) {
      badgeClass = 'text-rose-300 bg-rose-950/80 border-rose-700 animate-pulse font-bold';
    } else if (conf < 85) {
      badgeClass = 'text-amber-300 bg-amber-950/60 border-amber-700';
    }

    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${badgeClass}`}>
        OCR: {conf}%
      </span>
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
              <p className="text-[10px] text-amber-300 font-normal">Reconhecimento Óptico de Caracteres</p>
            </div>
          </div>
          <button
            onClick={onOpenOCRModal}
            className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 px-2 py-0.5 rounded font-medium border border-amber-700 flex items-center space-x-1 transition-colors"
            title="Visualizar via amarela com bounding boxes"
          >
            <span>Ver DO</span>
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
              <p className="text-[10px] text-cyan-300 font-normal">CRC Nacional / Receita Federal / SIRC</p>
            </div>
          </div>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-800">
            FONTE C
          </span>
        </div>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200 font-semibold">{ocr.numeroDO}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.numeroDO)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300">{federada.numeroDO}</span>
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
              col1={
                <div className="relative">
                  <input
                    type="text"
                    value={declaracao.nomeFalecido}
                    onChange={(e) => onUpdateDeclaracaoField('nomeFalecido', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium uppercase">{ocr.nomeFalecido}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.nomeFalecido)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-semibold uppercase">{federada.nomeFalecido}</span>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('nomeFalecido')}
                    title="Preencher com o nome originário da CRC"
                  />
                </div>
              }
            />

            {/* ROW: CPF */}
            <CompareRow
              label="Cadastro de Pessoas Físicas (CPF)"
              field="cpf"
              status={getFieldStatus('cpf')}
              col1={
                <input
                  type="text"
                  value={declaracao.cpf}
                  onChange={(e) => onUpdateDeclaracaoField('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200 font-bold">{ocr.cpf}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.cpf)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300 font-bold">{federada.cpf}</span>
                  <CopyAction
                    onCopy={() => onCopyFromFederada('cpf')}
                    title="Copiar CPF validado na Receita Federal"
                  />
                </div>
              }
            />

            {/* ROW: RG / Órgão Emissor */}
            <CompareRow
              label="Documento de Identidade (RG)"
              field="rg"
              status={getFieldStatus('rg')}
              col1={
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={declaracao.rg}
                    onChange={(e) => onUpdateDeclaracaoField('rg', e.target.value)}
                    className="w-2/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={declaracao.rgOrgaoEmissor}
                    onChange={(e) => onUpdateDeclaracaoField('rgOrgaoEmissor', e.target.value)}
                    placeholder="SSP/UF"
                    className="w-1/3 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-[11px] text-white uppercase text-center"
                  />
                </div>
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200">{ocr.rg} ({ocr.rgOrgaoEmissor})</span>
                  {renderOCRConfidenceBadge(ocrConfidence.rg)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300">{federada.rg} ({federada.rgOrgaoEmissor})</span>
                  <CopyAction
                    onCopy={() => {
                      onCopyFromFederada('rg');
                      onCopyFromFederada('rgOrgaoEmissor');
                    }}
                    title="Copiar RG da base oficial"
                  />
                </div>
              }
            />

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
                    className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white text-xs"
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
                  <span className="text-slate-300">{ocr.sexo === 'M' ? 'Masc.' : 'Fem.'} | {ocr.corRaca}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.sexo)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300">{federada.sexo === 'M' ? 'Masc.' : 'Fem.'} | {federada.corRaca}</span>
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
              col1={
                <input
                  type="date"
                  value={declaracao.dataNascimento}
                  onChange={(e) => onUpdateDeclaracaoField('dataNascimento', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200">{ocr.dataNascimento}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.dataNascimento)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300 font-semibold">{federada.dataNascimento}</span>
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
                    className="w-2/3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
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
                  <span className="font-mono text-slate-200 font-bold">{ocr.dataObito} às {ocr.horaObito}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.dataObito)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-300">{federada.dataObito} ({federada.horaObito})</span>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
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
                  <span className="font-semibold text-slate-200">{ocr.estadoCivil}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.estadoCivil)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300">{federada.estadoCivil}</span>
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
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
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
                      <span className="font-mono text-slate-200">{ocr.dataCasamento || 'Não anotado'}</span>
                      {renderOCRConfidenceBadge(ocrConfidence.dataCasamento)}
                    </div>
                    <div className="text-slate-300 uppercase truncate">{ocr.nomeConjuge || '---'}</div>
                  </div>
                }
                col3={
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-300 font-bold">{federada.dataCasamento || 'Sem assento'}</span>
                      <CopyAction
                        onCopy={() => {
                          onCopyFromFederada('dataCasamento');
                          onCopyFromFederada('nomeConjuge');
                        }}
                        title="Copiar dados do Livro B (Casamento)"
                      />
                    </div>
                    <div className="text-cyan-300 font-semibold uppercase truncate">{federada.nomeConjuge || '---'}</div>
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
              col1={
                <input
                  type="text"
                  value={declaracao.nomeMae}
                  onChange={(e) => onUpdateDeclaracaoField('nomeMae', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase focus:outline-none focus:border-indigo-500 font-medium"
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 uppercase truncate max-w-[180px]">{ocr.nomeMae}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.nomeMae)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-bold uppercase truncate max-w-[180px]">{federada.nomeMae}</span>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase focus:outline-none focus:border-indigo-500 font-medium"
                />
              }
              col2={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 uppercase truncate max-w-[180px]">{ocr.nomePai}</span>
                  {renderOCRConfidenceBadge(ocrConfidence.nomePai)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-bold uppercase truncate max-w-[180px]">{federada.nomePai}</span>
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
                  <p className="text-slate-200 text-xs italic">{ocr.causaMortis}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-400">CID: {ocr.cid10}</span>
                    {renderOCRConfidenceBadge(ocrConfidence.causaMortis)}
                  </div>
                </div>
              }
              col3={
                <div className="space-y-1 text-xs">
                  <p className="text-cyan-300 text-xs">{federada.causaMortis}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-cyan-400">CID: {federada.cid10}</span>
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
                      className="w-2/3 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white font-mono text-center font-bold"
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
                    <div className="text-slate-200">{ocr.nomeMedico}</div>
                    <div className="font-mono font-bold text-amber-300">CRM {ocr.crmMedico}/{ocr.ufCrm}</div>
                  </div>
                  {renderOCRConfidenceBadge(ocrConfidence.crmMedico)}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">{federada.nomeMedico}</div>
                    <div className="font-mono font-bold text-cyan-400">CRM {federada.crmMedico}/{federada.ufCrm}</div>
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
                  <div className="text-slate-200">{ocr.localObito}</div>
                  <div className="text-slate-400">{ocr.municipioObito}/{ocr.ufObito}</div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">{federada.localObito}</div>
                    <div className="text-cyan-400 font-semibold">{federada.municipioObito}/{federada.ufObito}</div>
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
                  <div className="text-slate-200">{ocr.sepultamentoCremacao}</div>
                  <div className="text-slate-400 text-[11px]">{ocr.cemiterio}</div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300">{federada.sepultamentoCremacao}</div>
                    <div className="text-cyan-400 text-[11px]">{federada.cemiterio}</div>
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
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white text-xs"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white text-xs"
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
                  <div className="text-slate-300">Bens: {ocr.deixouBens} | Filhos: {ocr.deixouFilhos}</div>
                  {ocr.nomesFilhos && <div className="text-slate-400 text-[11px] truncate">{ocr.nomesFilhos}</div>}
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="text-cyan-300">Bens: {federada.deixouBens} | Filhos: {federada.deixouFilhos}</div>
                    {federada.nomesFilhos && <div className="text-cyan-400 text-[11px] truncate">{federada.nomesFilhos}</div>}
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
                  <div className="text-slate-200 uppercase">{ocr.nomeDeclarante}</div>
                  <div className="text-slate-400 text-[11px]">{ocr.qualificacaoDeclarante}</div>
                </div>
              }
              col3={
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-cyan-300 uppercase">{federada.nomeDeclarante}</div>
                    <div className="text-cyan-400 text-[11px]">{federada.qualificacaoDeclarante}</div>
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
  status: { status: string; label: string; color: string };
  col1: React.ReactNode;
  col2: React.ReactNode;
  col3: React.ReactNode;
}

const CompareRow: React.FC<CompareRowProps> = ({ label, status, col1, col2, col3 }) => {
  return (
    <div className="px-3 py-2 hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-400">{label}</span>
        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
        <div className="pr-1">{col1}</div>
        <div className="px-2 py-1 bg-slate-950/60 rounded border border-slate-800 min-h-[32px] flex items-center">
          <div className="w-full">{col2}</div>
        </div>
        <div className="px-2 py-1 bg-slate-950/60 rounded border border-slate-800 min-h-[32px] flex items-center">
          <div className="w-full">{col3}</div>
        </div>
      </div>
    </div>
  );
};

// Copy button component
const CopyAction: React.FC<{ onCopy: () => void; title: string }> = ({ onCopy, title }) => (
  <button
    type="button"
    onClick={onCopy}
    title={title}
    className="ml-1 p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
  >
    <Copy className="w-3 h-3" />
  </button>
);
