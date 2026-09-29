// Motor de rolagem: teste de pericia de Ordem Paranormal + expressoes livres (2d6+3, 4d20kh1...).

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export interface OrdemTestResult {
  kind: 'ordem-test';
  attributeValue: number;
  diceCount: number;
  dice: number[];
  chosen: number;
  pickedLowest: boolean; // acontece quando o atributo e 0 (rola 2d20 e pega o menor)
  bonus: number;
  total: number;
  dt: number | null;
  success: boolean | null;
  critical: boolean; // manteve um 20 natural
  fumble: boolean; // manteve um 1 natural
}

/**
 * Teste de Ordem Paranormal:
 * - rola Nd20, onde N = valor do atributo (minimo 1);
 * - atributo 0 => rola 2d20 e fica com o MENOR;
 * - pega o dado escolhido e soma o bonus (treino + outros);
 * - compara com a DT (padrao 15) se informada.
 */
export function rollOrdemTest(
  attributeValue: number,
  bonus = 0,
  dt: number | null = null,
): OrdemTestResult {
  const pickedLowest = attributeValue <= 0;
  const diceCount = pickedLowest ? 2 : attributeValue;
  const dice = Array.from({ length: diceCount }, () => rollDie(20));
  const chosen = pickedLowest ? Math.min(...dice) : Math.max(...dice);
  const total = chosen + bonus;
  const success = dt == null ? null : total >= dt;
  return {
    kind: 'ordem-test',
    attributeValue,
    diceCount,
    dice,
    chosen,
    pickedLowest,
    bonus,
    total,
    dt,
    success,
    critical: !pickedLowest && chosen === 20,
    fumble: chosen === 1,
  };
}

export interface ExpressionTerm {
  raw: string;
  count: number;
  sides: number;
  keep: { mode: 'kh' | 'kl'; n: number } | null;
  results: number[];
  kept: number[];
  sign: 1 | -1;
  subtotal: number;
}

export interface ExpressionResult {
  kind: 'expression';
  expression: string;
  terms: ExpressionTerm[];
  modifier: number;
  total: number;
  valid: boolean;
  error?: string;
}

const TERM_RE = /^(\d*)d(\d+)(?:k(h|l)(\d+))?$/i;

export function rollExpression(input: string): ExpressionResult {
  const expression = input.trim();
  const base: Omit<ExpressionResult, 'terms' | 'total' | 'valid'> = {
    kind: 'expression',
    expression,
    modifier: 0,
  };
  if (!expression) {
    return { ...base, terms: [], total: 0, valid: false, error: 'Expressão vazia' };
  }

  const tokens = expression.replace(/\s+/g, '').match(/[+-]?[^+-]+/g);
  if (!tokens) {
    return { ...base, terms: [], total: 0, valid: false, error: 'Expressão inválida' };
  }

  const terms: ExpressionTerm[] = [];
  let modifier = 0;

  for (const token of tokens) {
    const sign: 1 | -1 = token.startsWith('-') ? -1 : 1;
    const body = token.replace(/^[+-]/, '');

    if (/^\d+$/.test(body)) {
      modifier += sign * parseInt(body, 10);
      continue;
    }

    const m = body.match(TERM_RE);
    if (!m) {
      return {
        ...base,
        terms: [],
        total: 0,
        valid: false,
        error: `Termo inválido: "${body}"`,
      };
    }

    const count = m[1] ? parseInt(m[1], 10) : 1;
    const sides = parseInt(m[2], 10);
    if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
      return { ...base, terms: [], total: 0, valid: false, error: `Termo fora do limite: "${body}"` };
    }

    const results = Array.from({ length: count }, () => rollDie(sides));
    let kept = results;
    let keep: ExpressionTerm['keep'] = null;
    if (m[3]) {
      const mode = m[3].toLowerCase() === 'h' ? 'kh' : 'kl';
      const n = Math.min(parseInt(m[4], 10), count);
      const sorted = [...results].sort((a, b) => (mode === 'kh' ? b - a : a - b));
      kept = sorted.slice(0, n);
      keep = { mode, n };
    }
    const subtotal = sign * kept.reduce((a, b) => a + b, 0);
    terms.push({ raw: body, count, sides, keep, results, kept, sign, subtotal });
  }

  const total = terms.reduce((a, t) => a + t.subtotal, 0) + modifier;
  return { ...base, terms, modifier, total, valid: true };
}
