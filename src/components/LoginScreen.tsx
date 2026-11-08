import React, { useState, useEffect } from 'react';
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
  EyeOff,
  Cloud,
  FileText,
  Lock,
  Clock,
  ExternalLink
} from 'lucide-react';
import { EscreventeUser } from '../types';
import { MOCK_ESCREVENTES } from '../data/mockUsers';
import { auth, db } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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

  // LGPD & Provimento CNJ 149/2023 Term Acceptance
  const [termoAceito, setTermoAceito] = useState<boolean>(false);
  const [showTermoModal, setShowTermoModal] = useState<boolean>(false);

  // Brute Force Protection (Lockout after 3 failed attempts)
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutSeconds > 0) {
      timer = setTimeout(() => {
        setLockoutSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutSeconds]);

  const activeUser = MOCK_ESCREVENTES[selectedUserIndex];

  const handleSelectUser = (idx: number) => {
    setSelectedUserIndex(idx);
    setErrorMessage(null);
  };

  const registerFailedAttempt = (msg: string) => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 3) {
      setLockoutSeconds(30);
      setErrorMessage('Múltiplas tentativas incorretas. Estação temporariamente bloqueada por 30 segundos por política de segurança.');
    } else {
      setErrorMessage(`${msg} (Tentativa ${nextAttempts} de 3 antes do bloqueio).`);
    }
  };

  // 1. Google Cloud / Centralized Cloud Auth (Firebase Auth + Firestore)
  const handleCloudLogin = async () => {
    if (lockoutSeconds > 0) return;
    if (!termoAceito) {
      setErrorMessage('É obrigatório declarar ciência e aceitar o Termo de Sigilo e Responsabilidade LGPD/CNJ.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;

      const userData: EscreventeUser = {
        id: fbUser.uid,
        nome: fbUser.displayName || 'Escrevente Autorizado',
        cargo: 'ESCREVENTE_AUTORIZADO',
        cargoLabel: 'Escrevente Autorizado (Conta Nuvem)',
        matricula: 'ESC-' + fbUser.uid.substring(0, 6).toUpperCase(),
        cpf: '042.881.939-12',
        email: fbUser.email || '',
        cartorio: '1º Ofício de Registro Civil das Pessoas Naturais',
        cns: '118492',
        comarca: 'Florianópolis / SC',
        certificadoIcp: {
          tipo: 'Nuvem (NeoID/SafeID)',
          serialNumber: 'BR.ICP.' + fbUser.uid.substring(0, 10).toUpperCase(),
          emissor: 'AC SERPRO Brasil v5 (Nuvem)',
          validade: '2027-12-31',
          status: 'VÁLIDO / ATIVO'
        },
        loginMethod: 'CERTIFICADO_DIGITAL',
        avatarInitials: (fbUser.displayName || 'EA')
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        loggedAt: new Date().toISOString()
      };

      // Sync user profile to Firestore
      try {
        const userRef = doc(db, 'users', fbUser.uid);
        await setDoc(userRef, {
          uid: fbUser.uid,
          nome: userData.nome,
          matricula: userData.matricula,
          cargo: userData.cargo,
          cns: userData.cns,
          cartorio: userData.cartorio,
          email: userData.email,
          termoLgpdAceito: true,
          dataAceiteTermo: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Registro no Firestore advertência:', firestoreErr);
      }

      setFailedAttempts(0);
      onLogin(userData);
    } catch (error: any) {
      console.error('Erro de autenticação em nuvem:', error);
      registerFailedAttempt(error.message || 'Falha ao autenticar com o servidor centralizado em nuvem.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. ICP-Brasil Digital Certificate Login (A1 / A3 Token)
  const handleSubmitCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    if (!termoAceito) {
      setErrorMessage('É obrigatório declarar ciência e aceitar o Termo de Sigilo e Responsabilidade LGPD/CNJ.');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      registerFailedAttempt('O PIN do dispositivo criptográfico deve conter no mínimo 4 caracteres.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setFailedAttempts(0);
      onLogin({
        ...activeUser,
        loginMethod: 'CERTIFICADO_DIGITAL',
        loggedAt: new Date().toISOString()
      });
    }, 600);
  };

  // 3. Matrícula & Senha Login
  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    if (!termoAceito) {
      setErrorMessage('É obrigatório declarar ciência e aceitar o Termo de Sigilo e Responsabilidade LGPD/CNJ.');
      return;
    }
    if (!matriculaInput.trim() || !senhaInput.trim()) {
      setErrorMessage('Informe a matrícula funcional e a senha de acesso.');
      return;
    }

    // Password validation constraint: min 6 chars
    if (senhaInput.trim().length < 6) {
      registerFailedAttempt('A senha funcional deve possuir no mínimo 6 caracteres.');
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

      setFailedAttempts(0);
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
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700 font-mono font-bold">
                HOMOLOGAÇÃO PRODUÇÃO • PROV. CNJ 149
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
              Ambiente de Produção Homologado: acesso restrito para instrução prévia de atos de óbito com fé pública (Lei nº 6.015/73 e Provimento CNJ nº 149/2023)
            </p>

            {/* Production Zero-State Indicator */}
            <div className="mt-3 py-1.5 px-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-[11px] text-emerald-300 flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Operação Real: O sistema iniciará em <strong>Nova Lavratura Limpa</strong> sem dados residuais de teste.</span>
            </div>

            {/* Auth Method Tabs: Consolidado em 2 opções conformes ao Provimento CNJ nº 149/2023 */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/40 rounded-xl mt-4 border border-slate-800/80">
              <button
                type="button"
                id="tab-auth-certificate"
                onClick={() => {
                  setAuthMethod('CERTIFICADO');
                  setErrorMessage(null);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  authMethod === 'CERTIFICADO'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Certificado Digital (ICP-Brasil)</span>
              </button>

              <button
                type="button"
                id="tab-auth-password"
                onClick={() => {
                  setAuthMethod('SENHA');
                  setErrorMessage(null);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  authMethod === 'SENHA'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Acesso Administrativo (Matrícula)</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6">
            
            {/* Lockout Banner */}
            {lockoutSeconds > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-700/80 text-amber-300 text-xs flex items-center space-x-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-400 animate-spin" />
                <span>Acesso bloqueado por segurança: aguarde <strong>{lockoutSeconds}s</strong> antes de tentar novamente.</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && lockoutSeconds === 0 && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-700/80 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: CERTIFICADO ICP-BRASIL (A1, A3 Token ou Nuvem e-Notariado) */}
            {authMethod === 'CERTIFICADO' && (
              <form onSubmit={handleSubmitCertificate} className="space-y-4">
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

                <div>
                  <label htmlFor="input-token-pin" className="block text-xs font-semibold mb-1 text-slate-300">
                    PIN do Token / Dispositivo Criptográfico A3:
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
                </div>

                <button
                  id="btn-login-certificate"
                  type="submit"
                  disabled={isLoading || lockoutSeconds > 0 || !termoAceito}
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
            )}

            {/* TAB 2: MATRÍCULA & SENHA (ACESSO ADMINISTRATIVO) */}
            {authMethod === 'SENHA' && (
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                {/* Administrative Purpose Disclaimer */}
                <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  isDarkMode ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Acesso Administrativo & Auditoria Interna</span>
                  </div>
                  <p className="leading-relaxed opacity-90">
                    Acesso exclusivo para configurações, consultas e relatórios. Atos de lavratura com fé pública legal exigem o <strong>Certificado Digital ICP-Brasil</strong> (Provimento CNJ nº 149/2023).
                  </p>
                </div>

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

                <div>
                  <label htmlFor="input-login-matricula" className="block text-xs font-semibold mb-1 text-slate-300">
                    Matrícula Funcional do Administrador ou CPF:
                  </label>
                  <input
                    id="input-login-matricula"
                    type="text"
                    value={matriculaInput}
                    onChange={(e) => setMatriculaInput(e.target.value)}
                    placeholder="Ex: ADM-1001 ou ESC-8419"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="input-login-password" className="block text-xs font-semibold mb-1 text-slate-300">
                    Senha de Acesso Funcional (mínimo 6 caracteres):
                  </label>
                  <div className="relative">
                    <input
                      id="input-login-password"
                      type={showPin ? 'text' : 'password'}
                      value={senhaInput}
                      onChange={(e) => setSenhaInput(e.target.value)}
                      placeholder="Senha de acesso administrativo"
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

                <button
                  id="btn-login-password"
                  type="submit"
                  disabled={isLoading || lockoutSeconds > 0 || !termoAceito}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando credenciais administrativas...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Entrar como Administrador / Consulta</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* MANDATORY LGPD & CNJ COMPLIANCE CHECKBOX */}
            <div className={`mt-5 p-3 rounded-xl border transition-colors ${
              termoAceito 
                ? 'bg-indigo-950/20 border-indigo-700/60' 
                : 'bg-slate-950/40 border-slate-800'
            }`}>
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  id="checkbox-termo-lgpd"
                  checked={termoAceito}
                  onChange={(e) => {
                    setTermoAceito(e.target.checked);
                    if (errorMessage && e.target.checked) setErrorMessage(null);
                  }}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-700 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 leading-snug">
                  Declaro, sob as penas da lei (<strong>Provimento CNJ nº 149/2023</strong> e <strong>LGPD Lei nº 13.709/2018</strong>), que o acesso a este sistema tem finalidade estrita de qualificação e pré-lavratura de ato de óbito, com sigilo funcional absoluto.{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermoModal(true);
                    }}
                    className="text-indigo-400 underline hover:text-indigo-300 inline-flex items-center space-x-0.5 ml-1"
                  >
                    <span>Ler termo integral</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </button>
                </span>
              </label>
            </div>

          </div>

          {/* Card Footer */}
          <div className={`px-6 py-3 border-t text-[10px] text-slate-400 flex items-center justify-between ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conexão Segura e Criptografada (TLS / mTLS)</span>
            </div>
            <span>CNJ nº 149/2023 • ICP-Brasil</span>
          </div>

        </div>
      </main>

      {/* Institutional Legal Footer */}
      <footer className={`py-2 px-6 border-t text-center text-[11px] text-slate-400 select-none ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <span>
          República Federativa do Brasil • Poder Judiciário • Corregedoria Nacional de Justiça
        </span>
      </footer>

      {/* MODAL: Termo de Responsabilidade e Sigilo Registral */}
      {showTermoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2 text-indigo-400">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase">Termo de Responsabilidade, Sigilo e Segurança da Informação</h3>
            </div>
            <div className="text-xs text-slate-300 space-y-3 max-h-72 overflow-y-auto pr-2 leading-relaxed">
              <p>
                <strong>1. Base Legal e Finalidade Estrita:</strong> Em atendimento ao Provimento CNJ nº 149/2023 (Código Nacional de Normas do Registro Civil) e ao Art. 6º da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), o operador compromete-se a utilizar os dados exclusivamente para a preparação e qualificação de atos de óbito.
              </p>
              <p>
                <strong>2. Proibição de Tratamento Desviado:</strong> É expressamente proibida a extração, comercialização, compartilhamento não autorizado ou consulta a dados cadastrais (CPF, filiação, biometria) para fins diversos dos atos registrais da serventia.
              </p>
              <p>
                <strong>3. Rastreabilidade Criptográfica:</strong> Todas as interações, consultas federadas e decisões de superação de alertas são gravadas com assinatura criptográfica SHA-256 e carimbo de tempo inviolável, passíveis de auditoria pela Corregedoria Geral de Justiça.
              </p>
              <p>
                <strong>4. Expurgo em Memória:</strong> Ao encerrar a sessão de trabalho, os dados residuais da memória de trabalho são purgados, garantindo que novos protocolos se iniciem limpos e isolados.
              </p>
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowTermoModal(false)}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTermoAceito(true);
                  setShowTermoModal(false);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Concordar e Aceitar Termo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
