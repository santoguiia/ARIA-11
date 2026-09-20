/**
 * ARIA Quality Gate Engine - Funções Determinísticas de Validação
 * Módulo de validação em conformidade com Lei de Registros Públicos (Lei 6.015/73)
 * e Provimento CNJ nº 149/2023.
 */

/**
 * Validação oficial do CPF (Cadastro de Pessoas Físicas)
 * Algoritmo dos dois dígitos verificadores em Módulo 11.
 */
export function validateCPF(cpf: string): { valid: boolean; clean: string; error?: string } {
  if (!cpf) {
    return { valid: false, clean: '', error: 'CPF não informado.' };
  }

  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) {
    return { valid: false, clean, error: `CPF deve possuir 11 dígitos numéricos (encontrados ${clean.length}).` };
  }

  // Elimina CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) {
    return { valid: false, clean, error: 'CPF inválido (sequência de dígitos repetidos).' };
  }

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(9), 10)) {
    return { valid: false, clean, error: 'Dígito verificador 1 do CPF inconsistente.' };
  }

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(10), 10)) {
    return { valid: false, clean, error: 'Dígito verificador 2 do CPF inconsistente.' };
  }

  return { valid: true, clean };
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Normaliza nomes para comparação (caixa alta, sem acentos, sem espaços duplos)
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distância de Levenshtein para identificar divergências tipográficas em nomes
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const a = normalizeName(s1);
  const b = normalizeName(s2);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Similaridade entre dois nomes (0 a 1)
 */
export function nameSimilarity(s1: string, s2: string): number {
  const a = normalizeName(s1);
  const b = normalizeName(s2);
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Converte data string (YYYY-MM-DD) em objeto Date
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calcula a idade na data do óbito
 */
export function calculateAge(birthStr: string, deathStr: string): number | null {
  const birth = parseDate(birthStr);
  const death = parseDate(deathStr);
  if (!birth || !death) return null;

  let age = death.getFullYear() - birth.getFullYear();
  const m = death.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validação de CRM (Conselho Regional de Medicina)
 */
export function validateCRM(crm: string): boolean {
  if (!crm) return false;
  const clean = crm.replace(/\D/g, '');
  return clean.length >= 4 && clean.length <= 7;
}

/**
 * Hash simples SHA-256 no browser para encadeamento da trilha de auditoria
 */
export async function computeHash(content: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.error('Crypto subtle failed, fallback to pseudo hash', e);
  }
  // Fallback determinístico
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8) + 'e89c3a2f89b1c7d6';
}
