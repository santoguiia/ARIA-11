import React from 'react';

export interface DiffPart {
  text: string;
  isDivergent: boolean;
}

/**
 * Computes character-level or token-level differences between a current string and a reference string.
 * Accurately isolates exactly the divergent characters or words to be highlighted in red.
 */
export function getDiffParts(current: string, reference: string): DiffPart[] {
  if (!current) return [];
  if (!reference) {
    return [{ text: current, isDivergent: true }];
  }

  const cleanCurr = current.trim();
  const cleanRef = reference.trim();

  // If exact match (case insensitive)
  if (cleanCurr.toUpperCase() === cleanRef.toUpperCase()) {
    return [{ text: current, isDivergent: false }];
  }

  // Check if both are dates (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanCurr) && /^\d{4}-\d{2}-\d{2}$/.test(cleanRef)) {
    const [yC, mC, dC] = cleanCurr.split('-');
    const [yR, mR, dR] = cleanRef.split('-');

    const parts: DiffPart[] = [];
    parts.push({ text: yC, isDivergent: yC !== yR });
    parts.push({ text: '-', isDivergent: false });
    parts.push({ text: mC, isDivergent: mC !== mR });
    parts.push({ text: '-', isDivergent: false });
    parts.push({ text: dC, isDivergent: dC !== dR });
    return parts;
  }

  // Check if CPF formatted
  if (cleanCurr.includes('.') || cleanCurr.includes('-')) {
    const digitsCurr = cleanCurr.replace(/\D/g, '');
    const digitsRef = cleanRef.replace(/\D/g, '');
    
    // If prefix matches and only suffix/check digits differ
    if (digitsCurr.slice(0, 9) === digitsRef.slice(0, 9) && digitsCurr.slice(9) !== digitsRef.slice(9)) {
      const splitIdx = cleanCurr.lastIndexOf('-');
      if (splitIdx !== -1) {
        return [
          { text: cleanCurr.slice(0, splitIdx + 1), isDivergent: false },
          { text: cleanCurr.slice(splitIdx + 1), isDivergent: true }
        ];
      }
    }
  }

  // Token-based comparison for names and textual phrases
  const currWords = cleanCurr.split(/(\s+)/);
  const refWordsUpper = cleanRef.toUpperCase().split(/\s+/);

  const parts: DiffPart[] = [];

  for (const token of currWords) {
    if (/^\s+$/.test(token)) {
      parts.push({ text: token, isDivergent: false });
      continue;
    }

    const tokenUpper = token.toUpperCase().replace(/[.,;:()]/g, '');
    const isPresentInRef = refWordsUpper.includes(tokenUpper);

    parts.push({
      text: token,
      isDivergent: !isPresentInRef
    });
  }

  return parts;
}

interface DiffHighlightProps {
  current: string | number | undefined;
  reference: string | number | undefined;
  className?: string;
  divergentClassName?: string;
}

/**
 * Component that renders text with divergent parts highlighted in vivid red.
 */
export const DiffHighlight: React.FC<DiffHighlightProps> = ({
  current,
  reference,
  className = '',
  divergentClassName = 'bg-rose-950/80 text-rose-300 font-bold px-1 py-0.2 rounded border border-rose-600/90 underline decoration-rose-500 decoration-wavy shadow-xs'
}) => {
  const strCurr = String(current ?? '');
  const strRef = String(reference ?? '');

  if (!strCurr) return <span className="text-slate-500 italic font-normal">---</span>;
  if (!strRef) return <span className={className}>{strCurr}</span>;

  const parts = getDiffParts(strCurr, strRef);
  const hasDivergence = parts.some(p => p.isDivergent);

  if (!hasDivergence) {
    return <span className={className}>{strCurr}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-0.5 ${className}`}>
      {parts.map((part, idx) => {
        if (!part.isDivergent) {
          return <span key={idx}>{part.text}</span>;
        }

        return (
          <mark
            key={idx}
            className={`inline-block ${divergentClassName}`}
            title={`Divergência detectada em relação à outra fonte: "${strRef}"`}
          >
            {part.text}
          </mark>
        );
      })}
    </span>
  );
};

/**
 * Generates an isolated summary of divergent tokens for quick visual chips.
 */
export function extractDivergenceSummary(valA: string, valB: string): { divA: string; divB: string } | null {
  if (!valA || !valB) return null;
  if (valA.trim().toUpperCase() === valB.trim().toUpperCase()) return null;

  const partsA = getDiffParts(valA, valB);
  const partsB = getDiffParts(valB, valA);

  const divergentWordsA = partsA.filter(p => p.isDivergent).map(p => p.text.trim()).filter(Boolean);
  const divergentWordsB = partsB.filter(p => p.isDivergent).map(p => p.text.trim()).filter(Boolean);

  if (divergentWordsA.length === 0 && divergentWordsB.length === 0) return null;

  return {
    divA: divergentWordsA.join(' ') || valA,
    divB: divergentWordsB.join(' ') || valB
  };
}
