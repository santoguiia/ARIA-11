import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  KeyRound, 
  UserCheck, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { EscreventeUser } from '../types';
import { MOCK_ESCREVENTES } from '../data/mockUsers';

interface LoginScreenProps {
  onLogin: (user: EscreventeUser) => void;
  isDarkMode: boolean;
  onToggleDarkMode?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  isDarkMode
}) => {
  const [authMethod, setAuthMethod] = useState<'CERTIFICADO' | 'SENHA'>('CERTIFICADO');
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [matriculaInput, setMatriculaInput] = useState<string>('');
  const [senhaInput, setSenhaInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeUser = MOCK_ESCREVENTES[selectedUserIndex];

  const handleSelectUser = (idx: number) => {
    setSelectedUserIndex(idx);
    setErrorMessage(null);
  };

  const handleSubmitCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Por favor, digite o PIN do certificado digital.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    // Cryptographic token handshake simulation (PKCS#11 / mTLS)
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        ...activeUser,
        loginMethod: 'CERTIFICADO_DIGITAL',
        loggedAt: new Date().toISOString()
      });
    }, 600);
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matriculaInput.trim() || !senhaInput.trim()) {
      setErrorMessage('Informe a matrícula funcional e a senha de acesso.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const matched = MOCK_ESCREVENTES.find(
        u => u.matricula.toLowerCase() === matriculaInput.trim().toLowerCase() ||
             u.cpf.replace(/\D/g, '') === matriculaInput.replace(/\D/g, '')
      ) || {
        ...activeUser,
        matricula: matriculaInput.trim().toUpperCase()
      };

      onLogin({
        ...matched,
        loginMethod: 'MATRICULA_SENHA',
        loggedAt: new Date().toISOString()
      });
    }, 600);
  };

  return (
    <div className={`min-h-screen w-screen flex flex-col justify-between select-none ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Top Bar with Institutional Context */}
      <header className={`px-6 py-3 border-b flex items-center justify-between text-xs ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wide">ARIA Desktop</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-700 font-mono font-bold">
                v1.4.2 [REF-11 / INE5448]
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Quality Gate & Assistente de Pré-Lavratura de Assentos de Óbito
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>CNS: <strong>118492</strong> • 1º Ofício de RCPN da Capital / SC</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          {/* Official Emblem Banner */}
          <div className={`px-6 pt-6 pb-4 text-center border-b ${
            isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Scale className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-base font-bold uppercase tracking-wider">
              Autenticação do Escrevente Autorizado
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Acesso seguro para qualificação prévia de atos de óbito, validação cruzada determinística e colheita de fé pública (Lei nº 6.015/73)
            </p>

            {/* Auth Method Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/40 rounded-xl mt-4 border border-slate-800/80">
              <button
                type="button"
                id="tab-auth-certificate"
                onClick={() => {
                  setAuthMethod('CERTIFICADO');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  authMethod === 'CERTIFICADO'
                    ? 'bg-indigo-600 text-white shadow'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Certificado ICP-Brasil</span>
              </button>

              <button
                type="button"
                id="tab-auth-password"
                onClick={() => {
                  setAuthMethod('SENHA');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  authMethod === 'SENHA'
                    ? 'bg-indigo-600 text-white shadow'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Matrícula & Senha</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-700/80 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {authMethod === 'CERTIFICADO' ? (
              <form onSubmit={handleSubmitCertificate} className="space-y-4">
                
                {/* Certificate Selector via Windows CryptoAPI / PKCS#11 Repository */}
                <div>
                  <label htmlFor="select-certificate-token" className="block text-xs font-semibold mb-1.5 text-slate-300">
                    Certificado Digital Detectado (Token A3 / Smartcard):
                  </label>
                  <div className="relative">
                    <select
                      id="select-certificate-token"
                      value={selectedUserIndex}
                      onChange={(e) => handleSelectUser(Number(e.target.value))}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 border appearance-none pr-8 cursor-pointer ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {MOCK_ESCREVENTES.map((user, idx) => (
                        <option key={user.id} value={idx}>
                          {user.nome} • CPF {user.cpf} ({user.matricula})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Selected Certificate Cryptographic Details */}
                <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Titular da Chave:</span>
                    <span className="font-bold text-white uppercase">{activeUser.nome}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Autoridade Certificadora:</span>
                    <span className="font-medium text-emerald-400 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{activeUser.certificadoIcp.emissor}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Número de Série Criptográfico:</span>
                    <span className="font-mono text-slate-300">{activeUser.certificadoIcp.serialNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Status OCSP / Revogação:</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-1.5 py-0.2 rounded border border-emerald-800 font-semibold">
                      VÁLIDO / ATIVO ICP-BRASIL
                    </span>
                  </div>
                </div>

                {/* Token PIN Input */}
                <div>
                  <label htmlFor="input-token-pin" className="block text-xs font-semibold mb-1 text-slate-300">
                    PIN do Token / Assinatura Digital ICP-Brasil:
                  </label>
                  <div className="relative">
                    <input
                      id="input-token-pin"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Digite o PIN do dispositivo criptográfico"
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      title={showPin ? 'Ocultar PIN' : 'Exibir PIN'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Dispositivo padrão PKCS#11 FIPS 140-2 (Token criptográfico A3 / Smartcard)
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-login-certificate"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verificando cadeia ICP-Brasil...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Autenticar com Certificado ICP-Brasil</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                
                {/* Serventia Selector */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">
                    Serventia Registral (Cartório de RCPN):
                  </label>
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <span className="font-semibold block">1º Ofício de Registro Civil das Pessoas Naturais</span>
                      <span className="text-[10px] text-slate-400 font-mono">CNS: 118492 • Florianópolis / SC</span>
                    </div>
                  </div>
                </div>

                {/* Matrícula ou CPF */}
                <div>
                  <label htmlFor="input-login-matricula" className="block text-xs font-semibold mb-1 text-slate-300">
                    Matrícula Funcional do Escrevente ou CPF:
                  </label>
                  <input
                    id="input-login-matricula"
                    type="text"
                    value={matriculaInput}
                    onChange={(e) => setMatriculaInput(e.target.value)}
                    placeholder="Ex: ESC-8419 ou 042.881.939-12"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Senha */}
                <div>
                  <label htmlFor="input-login-password" className="block text-xs font-semibold mb-1 text-slate-300">
                    Senha de Acesso Funcional:
                  </label>
                  <div className="relative">
                    <input
                      id="input-login-password"
                      type={showPin ? 'text' : 'password'}
                      value={senhaInput}
                      onChange={(e) => setSenhaInput(e.target.value)}
                      placeholder="Senha do operador cartorial"
                      className={`w-full rounded-xl px-3 py-2 text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      title={showPin ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="btn-login-password"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Autenticando operador...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Entrar no Sistema ARIA</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

          {/* Card Footer */}
          <div className={`px-6 py-3 border-t text-[10px] text-slate-400 flex items-center justify-between ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conexão Local Segura (mTLS / OPA)</span>
            </div>
            <span>Provimento CNJ nº 149/2023 • ICP-Brasil</span>
          </div>

        </div>
      </main>

      {/* Institutional Legal Footer */}
      <footer className={`py-2 px-6 border-t text-center text-[11px] text-slate-400 select-none ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <span>
          República Federativa do Brasil • Poder Judiciário • Projeto Acadêmico REF-11 / INE5448 (UFSC)
        </span>
      </footer>

    </div>
  );
};
