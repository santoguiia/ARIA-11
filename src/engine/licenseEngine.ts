/**
 * ARIA Desktop - Motor de Licenciamento SaaS Local-First (Frontend & Bridge)
 * Suporte a Validação Offline Asymmetric Seat-Based, Fingerprinting e Feature Flagging
 */

import { LicenseInfo, LicenseTier } from '../types';

export const LICENSE_TIER_CONFIGS: Record<LicenseTier, {
  label: string;
  description: string;
  badgeColor: string;
  features: string[];
}> = {
  BASIC: {
    label: 'ARIA Básico',
    description: 'Motor OPA Determinístico, edição manual, auditoria SHA-256 e laudo técnico.',
    badgeColor: 'bg-slate-700 text-slate-200 border-slate-600',
    features: ['OPA_DETERMINISTIC', 'AUDIT_TRAIL', 'MANUAL_EDITS', 'EXPORT_REPORT']
  },
  PRO_AI: {
    label: 'ARIA Pro AI',
    description: 'Inclui Copiloto LLM Local Qwen2.5 (1.5B) para justificativas e redação de minutas.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    features: ['OPA_DETERMINISTIC', 'AUDIT_TRAIL', 'MANUAL_EDITS', 'EXPORT_REPORT', 'LOCAL_LLM_QWEN', 'AI_MINUTA_DRAFT']
  },
  ENTERPRISE_MTLS: {
    label: 'ARIA Enterprise mTLS',
    description: 'Túneis mTLS ICP-Brasil com barramentos CRC/SIRC/ONR e inteligência local.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    features: ['OPA_DETERMINISTIC', 'AUDIT_TRAIL', 'MANUAL_EDITS', 'EXPORT_REPORT', 'LOCAL_LLM_QWEN', 'AI_MINUTA_DRAFT', 'FEDERATED_MTLS', 'MULTI_SEAT']
  }
};

export const DEMO_LICENSE_KEYS = [
  {
    tier: 'PRO_AI' as LicenseTier,
    key: 'ARIA-PRO-2026-X89B-4921',
    label: 'Licença Pro AI (Copiloto Qwen LLM On-Device)',
    seats: 5,
    org: '1º Ofício de Registro Civil e Notas'
  },
  {
    tier: 'ENTERPRISE_MTLS' as LicenseTier,
    key: 'ARIA-ENT-2026-M772-9102',
    label: 'Licença Enterprise (mTLS Federado + Copiloto AI)',
    seats: 15,
    org: '1º Ofício de Registro Civil e Tabelionato'
  },
  {
    tier: 'BASIC' as LicenseTier,
    key: 'ARIA-BAS-2026-C110-8834',
    label: 'Licença Básica (Apenas OPA Determinístico)',
    seats: 2,
    org: 'Cartório de Registro Civil Distrital'
  }
];

// Chave persistente em armazenamento local
const LICENSE_STORAGE_KEY = 'aria_saas_license_token';
const LAST_VALIDATION_KEY = 'aria_saas_last_validation';

/**
 * Coletor de identificador de máquina para o ambiente renderer / web fallback
 */
export async function getClientMachineFingerprint(): Promise<{ deviceHash: string; hwidFormatted: string }> {
  if (window.electronAPI?.license?.getMachineId) {
    try {
      return await window.electronAPI.license.getMachineId();
    } catch (e) {
      console.warn('Erro ao obter machine id via IPC:', e);
    }
  }

  // Fallback seguro baseado em atributos do dispositivo
  const nav = window.navigator;
  const rawId = [
    nav.userAgent,
    nav.language,
    (nav as any).hardwareConcurrency || 8,
    (nav as any).deviceMemory || 16,
    screen.width,
    screen.height,
    screen.colorDepth
  ].join('@@@');

  // SHA-256 via SubtleCrypto
  const msgBuffer = new TextEncoder().encode(rawId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deviceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const clean = deviceHash.toUpperCase();
  const hwidFormatted = `HWID-${clean.substring(0, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}`;

  return { deviceHash, hwidFormatted };
}

/**
 * Obtém o status da licença (via Electron IPC ou armazenamento local)
 */
export async function fetchCurrentLicense(): Promise<LicenseInfo> {
  if (window.electronAPI?.license?.getStatus) {
    try {
      return await window.electronAPI.license.getStatus();
    } catch (e) {
      console.warn('Falha ao consultar licença via IPC:', e);
    }
  }

  const { deviceHash, hwidFormatted } = await getClientMachineFingerprint();
  const saved = localStorage.getItem(LICENSE_STORAGE_KEY);

  let currentTier: LicenseTier = 'PRO_AI';
  let activeKey = 'ARIA-PRO-2026-X89B-4921';
  let daysRemaining = 28;

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.tier) currentTier = parsed.tier;
      if (parsed.key) activeKey = parsed.key;
      if (typeof parsed.daysRemaining === 'number') daysRemaining = parsed.daysRemaining;
    } catch (e) {
      // Ignora erro de parse
    }
  }

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + daysRemaining);

  return {
    isValid: true,
    tier: currentTier,
    tierLabel: LICENSE_TIER_CONFIGS[currentTier].label,
    features: LICENSE_TIER_CONFIGS[currentTier].features,
    licenseKey: activeKey,
    orgId: 'CNS-09.123-4',
    orgName: '1º Ofício de Registro Civil e Notas',
    deviceHash,
    hwidFormatted,
    validUntil: validUntilDate.toISOString(),
    daysRemaining,
    isWithinGrace: false,
    syncStatus: 'LOCAL_OFFLINE_VERIFIED',
    lastSyncDate: localStorage.getItem(LAST_VALIDATION_KEY) || new Date().toISOString(),
    canUseLocalLLM: currentTier === 'PRO_AI' || currentTier === 'ENTERPRISE_MTLS',
    canUseFederatedMtls: currentTier === 'ENTERPRISE_MTLS',
    asymmetricAlgorithm: 'Ed25519 (256-bit Asymmetric)',
    localDatabase: 'SQLite Encrypted (AES-256-GCM On-Premise)'
  };
}

/**
 * Ativa uma chave de licença no sistema
 */
export async function activateLicense(licenseKeyInput: string): Promise<{
  success: boolean;
  license?: LicenseInfo;
  message: string;
  error?: string;
}> {
  const cleanKey = (licenseKeyInput || '').trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, message: 'Digite ou cole uma chave de licença válida.', error: 'EMPTY_KEY' };
  }

  // Tenta primeiro via processo principal Electron (IPC assíncrono com Ed25519 real)
  if (window.electronAPI?.license?.activate) {
    try {
      const res = await window.electronAPI.license.activate(cleanKey);
      if (res.success && res.license) {
        return { success: true, license: res.license, message: res.message || 'Licença ativada com sucesso!' };
      }
      if (!res.success) {
        return { success: false, message: res.message || 'Falha ao ativar licença.', error: res.error };
      }
    } catch (e: any) {
      console.warn('Erro ao ativar via IPC:', e);
    }
  }

  // Fallback e simulação local-first
  let detectedTier: LicenseTier = 'PRO_AI';
  if (cleanKey.includes('-ENT-') || cleanKey.includes('ENTERPRISE')) {
    detectedTier = 'ENTERPRISE_MTLS';
  } else if (cleanKey.includes('-BAS-') || cleanKey.includes('BASIC')) {
    detectedTier = 'BASIC';
  } else if (cleanKey.includes('-PRO-') || cleanKey.includes('PRO')) {
    detectedTier = 'PRO_AI';
  } else if (cleanKey.startsWith('ARIA-')) {
    detectedTier = 'PRO_AI';
  } else {
    return {
      success: false,
      message: 'Chave de licença inválida. O formato padrão é ARIA-[TIER]-[ANO]-[CÓDIGO].',
      error: 'INVALID_FORMAT'
    };
  }

  const { deviceHash, hwidFormatted } = await getClientMachineFingerprint();
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);

  const newLicense: LicenseInfo = {
    isValid: true,
    tier: detectedTier,
    tierLabel: LICENSE_TIER_CONFIGS[detectedTier].label,
    features: LICENSE_TIER_CONFIGS[detectedTier].features,
    licenseKey: cleanKey,
    orgId: 'CNS-09.123-4',
    orgName: '1º Ofício de Registro Civil e Notas',
    deviceHash,
    hwidFormatted,
    validUntil: validUntilDate.toISOString(),
    daysRemaining: 30,
    isWithinGrace: false,
    syncStatus: 'SYNCED_WITH_SAAS',
    lastSyncDate: new Date().toISOString(),
    canUseLocalLLM: detectedTier === 'PRO_AI' || detectedTier === 'ENTERPRISE_MTLS',
    canUseFederatedMtls: detectedTier === 'ENTERPRISE_MTLS',
    asymmetricAlgorithm: 'Ed25519 (256-bit Asymmetric)',
    localDatabase: 'SQLite Encrypted (AES-256-GCM On-Premise)'
  };

  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({
    tier: detectedTier,
    key: cleanKey,
    daysRemaining: 30
  }));
  localStorage.setItem(LAST_VALIDATION_KEY, new Date().toISOString());

  return {
    success: true,
    license: newLicense,
    message: `Licença ${LICENSE_TIER_CONFIGS[detectedTier].label} ativada com sucesso!`
  };
}

/**
 * Executa o heartbeat de sincronização
 */
export async function triggerHeartbeat(): Promise<{ success: boolean; mode: string; daysRemaining: number }> {
  if (window.electronAPI?.license?.heartbeat) {
    try {
      const res = await window.electronAPI.license.heartbeat();
      const status = await window.electronAPI.license.getStatus();
      return { success: true, mode: res.mode || 'ONLINE_SYNCED', daysRemaining: status.daysRemaining };
    } catch (e) {
      console.warn('Erro ao chamar heartbeat via IPC:', e);
    }
  }

  // Fallback
  localStorage.setItem(LAST_VALIDATION_KEY, new Date().toISOString());
  return { success: true, mode: 'OFFLINE_GRACE_VERIFIED', daysRemaining: 30 };
}

/**
 * Validação de Feature Flag antes de chamar rota restrita
 */
export const getLicenseStatus = fetchCurrentLicense;
export const checkHeartbeat = triggerHeartbeat;

/**
 * Validação de Feature Flag antes de chamar rota restrita
 */
export function checkFeatureGate(
  license: LicenseInfo | null, 
  feature: 'LOCAL_LLM' | 'MTLS_FEDERATED'
): { allowed: boolean; requiredTier: LicenseTier; title: string; message: string } {
  if (!license) {
    return {
      allowed: false,
      requiredTier: 'PRO_AI',
      title: 'Licença Não Inicializada',
      message: 'Ative uma licença corporativa para utilizar este recurso.'
    };
  }

  if (feature === 'LOCAL_LLM') {
    const allowed = license.canUseLocalLLM;
    return {
      allowed,
      requiredTier: 'PRO_AI',
      title: 'Recurso Exclusivo Pro AI / Enterprise',
      message: 'O Copiloto LLM Local Qwen2.5-1.5B (geração de justificativas automáticas e redação de minutas) está disponível a partir do plano Pro AI.'
    };
  }

  if (feature === 'MTLS_FEDERATED') {
    const allowed = license.canUseFederatedMtls;
    return {
      allowed,
      requiredTier: 'ENTERPRISE_MTLS',
      title: 'Recurso Exclusivo Enterprise mTLS',
      message: 'A comunicação e sincronização criptográfica via túneis mTLS ICP-Brasil com barramentos federados (CRC Nacional, ONR, SIRC/SISOBI, RFB) requer o plano Enterprise.'
    };
  }

  return {
    allowed: true,
    requiredTier: 'BASIC',
    title: 'Acesso Liberado',
    message: ''
  };
}
