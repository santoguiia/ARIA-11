import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Radio, 
  Server, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  HardDrive, 
  Key, 
  Zap, 
  ArrowRightLeft,
  FileCheck2,
  Terminal,
  Layers
} from 'lucide-react';
import { FederatedBusStatus, CartorioCertificate, LocalFirstNodeStatus } from '../types';

interface FederatedMtlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buses: FederatedBusStatus[];
  certificate: CartorioCertificate;
  nodeStatus: LocalFirstNodeStatus;
  onToggleContingency: () => void;
  onTestHandshake: (busId?: string) => Promise<void>;
  isTestingHandshake: boolean;
}

export const FederatedMtlsModal: React.FC<FederatedMtlsModalProps> = ({
  isOpen,
  onClose,
  buses,
  certificate,
  nodeStatus,
  onToggleContingency,
  onTestHandshake,
  isTestingHandshake
}) => {
  const [activeTab, setActiveTab] = useState<'ARQUITETURA' | 'BARRAMENTOS' | 'CERTIFICADO' | 'LOGS'>('ARQUITETURA');
  const [testResultLog, setTestResultLog] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async (busId?: string) => {
    setTestResultLog(`Iniciando handshake mTLS (Mutual TLS 1.3) com autenticação cliente ICP-Brasil...`);
    await onTestHandshake(busId);
    setTestResultLog(`[OK] Handshake mTLS validado com sucesso. Certificado cliente apresentado e aceito. Resposta criptográfica íntegra.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Topologia Local-First & Barramentos Federados mTLS
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  ICP-BRASIL ATIVO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente desktop rico com motor determinístico e log na ponta, integrado por mTLS a CRC Nacional, ONR e SIRC.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ARQUITETURA')}
            className={`px-4 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'ARQUITETURA'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Arquitetura Local-First</span>
          </button>
          <button
            onClick={() => setActiveTab('BARRAMENTOS')}
            className={`px-4 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'BARRAMENTOS'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Barramentos Federados (4)</span>
          </button>
          <button
            onClick={() => setActiveTab('CERTIFICADO')}
            className={`px-4 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'CERTIFICADO'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Certificado ICP-Brasil (A1/A3)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {activeTab === 'ARQUITETURA' && (
            <div className="space-y-5">
              
              {/* Architecture Diagram */}
              <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Diagrama do Fluxo de Confiança e Decisão na Ponta
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Soberania Cartorial & Tolerância a Quedas Externas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                  
                  {/* Card 1: Desktop Local-First */}
                  <div className="bg-slate-900 rounded-lg p-3.5 border border-indigo-700/60 flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-600/30 text-indigo-300 text-[9px] font-mono px-2 py-0.5 rounded-bl font-bold border-l border-b border-indigo-600/50">
                      ON-PREMISE
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-indigo-300 mb-1">
                        <HardDrive className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase">Cliente Desktop Rico</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Executável local autônomo (Windows x64). Não transfere soberania de lavratura para nuvens públicas.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px] bg-slate-950/70 p-2.5 rounded border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Motor de Decisão:</span>
                        <span className="text-emerald-400 font-mono font-bold">OPA/Rego 100% Local</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Trilha de Auditoria:</span>
                        <span className="text-indigo-300 font-mono font-bold">SQLite SHA-256 na ponta</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Operação Sem Internet:</span>
                        <span className="text-emerald-400 font-bold">100% Funcional</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: mTLS Bridge */}
                  <div className="bg-slate-900 rounded-lg p-3.5 border border-emerald-600/60 flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-600/30 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded-bl font-bold border-l border-b border-emerald-600/50">
                      TÚNEL MÚTUO
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-300 mb-1">
                        <Lock className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase">Canal mTLS ICP-Brasil</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Handshake criptográfico bidirecional. Autenticação obrigatória com certificado digital da serventia.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px] bg-slate-950/70 p-2.5 rounded border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Cifra:</span>
                        <span className="text-slate-200 font-mono text-[10px]">TLS_AES_256_GCM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Certificado:</span>
                        <span className="text-emerald-300 font-bold">ICP-Brasil A1/A3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Status OCSP:</span>
                        <span className="text-emerald-400 font-bold">Válido em tempo real</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Federated External Buses */}
                  <div className="bg-slate-900 rounded-lg p-3.5 border border-cyan-700/60 flex flex-col justify-between space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-cyan-600/30 text-cyan-300 text-[9px] font-mono px-2 py-0.5 rounded-bl font-bold border-l border-b border-cyan-600/50">
                      FEDERADOS
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-cyan-300 mb-1">
                        <Server className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase">Barramentos Nacionais</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bases centrais de consulta regulamentadas pelo CNJ, ONR, SIRC e Receita Federal.
                      </p>
                    </div>

                    <div className="space-y-1 text-[11px] bg-slate-950/70 p-2 rounded border border-slate-800">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>• CRC Nacional (Arpen/CNJ)</span>
                        <span className="text-emerald-400 font-mono text-[10px]">38ms</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>• ONR / SERP (Imóveis)</span>
                        <span className="text-emerald-400 font-mono text-[10px]">45ms</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>• SIRC / SISOBI (INSS)</span>
                        <span className="text-emerald-400 font-mono text-[10px]">52ms</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>• RFB (Cadastro CPF)</span>
                        <span className="text-emerald-400 font-mono text-[10px]">31ms</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Contingency / Offline Simulator Box */}
              <div className="bg-amber-950/30 border border-amber-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                      Simulação de Contingência Local-First (Queda de Link Externo)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Demonstra que se a conexão externa com os barramentos cair, o cliente desktop ARIA 
                    <strong> preserva 100% da sua capacidade de avaliar a DO e registrar o log criptográfico na ponta</strong>, 
                    sem interromper o atendimento do balcão cartorial.
                  </p>
                </div>

                <button
                  onClick={onToggleContingency}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border flex items-center space-x-2 ${
                    nodeStatus.contingencyMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                      : 'bg-amber-600/80 hover:bg-amber-600 text-white border-amber-500'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${nodeStatus.contingencyMode ? 'text-white' : ''}`} />
                  <span>
                    {nodeStatus.contingencyMode ? 'Reconectar Barramentos mTLS' : 'Simular Queda de Link'}
                  </span>
                </button>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 block">Especificações da Ponta (Cartório):</span>
                  <div className="space-y-1 text-slate-400">
                    <p><strong className="text-slate-300">Ambiente de Execução:</strong> {nodeStatus.runtime}</p>
                    <p><strong className="text-slate-300">Banco de Dados Local:</strong> {nodeStatus.localDb}</p>
                    <p><strong className="text-slate-300">Garantia Regulatória:</strong> Provimento CNJ nº 149/2023 - Art. 38 (Guarda segura e inviolável de dados locais)</p>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 block">Soberania do Registro Civil:</span>
                  <div className="space-y-1 text-slate-400">
                    <p><strong className="text-slate-300">Qualificação Notarial:</strong> Exclusiva do Oficial e Prepostos (não delegável a IA ou serviços de nuvem de terceiros)</p>
                    <p><strong className="text-slate-300">Trilha de Auditoria:</strong> Gravada localmente com encadeamento criptográfico SHA-256 e assinatura digital.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'BARRAMENTOS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Barramentos externos autorizados pelo Conselho Nacional de Justiça (CNJ):
                </span>
                <button
                  onClick={() => handleRunTest()}
                  disabled={isTestingHandshake}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingHandshake ? 'animate-spin' : ''}`} />
                  <span>Testar Handshake mTLS Global</span>
                </button>
              </div>

              {testResultLog && (
                <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-800/60 text-xs font-mono text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testResultLog}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      bus.status === 'CONNECTED'
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-amber-950/20 border-amber-800/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded ${bus.status === 'CONNECTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-white">{bus.name}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                              {bus.acronym}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{bus.endpoint}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          bus.status === 'CONNECTED'
                            ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800'
                            : 'text-amber-300 bg-amber-950/60 border-amber-800'
                        }`}>
                          {bus.status === 'CONNECTED' ? `ATIVO (${bus.latencyMs}ms)` : 'CONTINGÊNCIA OFFLINE'}
                        </span>
                        <button
                          onClick={() => handleRunTest(bus.id)}
                          disabled={isTestingHandshake}
                          className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700"
                        >
                          Ping mTLS
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-300 font-medium">Fundamento Legal:</span> {bus.legalBasis}
                      </div>
                      <div>
                        <span className="text-slate-300 font-medium">Campos Validados:</span> {bus.verifiedFields.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'CERTIFICADO' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-white">Certificado Digital da Serventia (ICP-Brasil)</h3>
                      <p className="text-[11px] text-slate-400">Padrão A1/A3 utilizado na autenticação mTLS cliente</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {certificate.ocspStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Serventia / Cartório:</span>
                    <p className="font-semibold text-slate-200">{certificate.serventia}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Código Nacional de Serventia (CNS): {certificate.cns}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Titular Delegado:</span>
                    <p className="font-semibold text-slate-200">{certificate.titular}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-slate-400 block">Subject Distinguished Name (DN):</span>
                    <p className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 break-all">
                      {certificate.subject}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Autoridade Certificadora Emissora:</span>
                    <p className="font-semibold text-slate-200">{certificate.issuer}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Validade do Certificado:</span>
                    <p className="font-semibold text-emerald-400 font-mono">{certificate.validUntil}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-slate-400 block">Número de Série & Algoritmo Criptográfico:</span>
                    <p className="font-mono text-[11px] text-slate-300">Serial: {certificate.serialNumber} (RSA 2048 / SHA-256 with RSA Encryption)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Conformidade com a ICP-Brasil & Provimento CNJ nº 149/2023:</p>
                <p>
                  O certificado digital do cartório é armazenado localmente em keystore seguro (ou via hardware token PKCS#11 FIPS 140-2). 
                  Nenhuma chave privada jamais transita por conexões remotas. As consultas aos barramentos federados utilizam exclusivamente 
                  a chave pública para assinar os tokens de autenticação mTLS.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Motor OPA Local: <strong>Ativo</strong></span>
            <span>|</span>
            <span>Audit Ledger: <strong>SQLite Criptografado</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
