// services/ai/statementParser.ts
//
// Parseo 100% local de movimientos bancarios a partir del texto OCR ya
// redactado. Nunca se envía este texto a la IA. Los resultados son
// "candidatos" que el usuario debe verificar antes de guardarlos.

export type ParsedTransactionType = "income" | "expense";

export interface ParsedTransaction {
  id: string;
  /** Timestamp en ms (null si no se pudo determinar la fecha). */
  date: number | null;
  /** Valor del movimiento (null si no se pudo determinar). */
  amount: number | null;
  type: ParsedTransactionType;
  /** Descripción ya redactada. */
  description: string;
  confidence: "high" | "medium" | "low";
}

export interface StatementParseResult {
  candidates: ParsedTransaction[];
  /** Líneas con dígitos que no se pudieron interpretar como movimiento. */
  unparsedLines: string[];
}

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const normalizeWord = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[ñ]/g, "n");

// Líneas que son encabezados, totales o información y no movimientos.
const HEADER_ONLY =
  /^(?:pagina(?:\s+\d+)?|extracto|estado\s+de\s+cuenta|periodo|resumen|total(?:\s+general)?|disponible|saldo(?:\s+(?:inicial|anterior|final|actual|disponible))?|detalle|movimientos?|fecha|valor|monto|importe)\b/i;

// Línea de encabezado de columnas: "FECHA DETALLE VALOR SALDO",
// "FECHA DEBITO CREDITO", etc.
const HEADER_COLUMNS =
  /^(?=.*\b(?:fecha|valor|monto|importe|detalle|descripcion)\b)(?=.*\b(?:debito|credito|abono|cargo|saldo|balance|retiro|ingreso|egreso)\b).+$/i;

const isSeparatorLine = (line: string) => /^[\s|\-*=._]+$/.test(line);

// Keywords que delatan ingresos.
const INCOME_KEYWORDS =
  /\b(?:nomina|ingreso|ingresos|abono|abonos|credito|creditos|consignacion|consignaciones|deposito|depositos|recibida|recibido|transferencia recibida|devolucion|devoluciones|ajuste a favor|intereses ganados|pago de nomina)\b/;

// Keywords que delatan egresos.
const EXPENSE_KEYWORDS =
  /\b(?:retiro|retiros|pago|pagos|compra|compras|debito|debitos|cargo|cargos|salida|salidas|cuota|cuotas|interes|intereses|comision|comisiones|impuesto|impuestos|transferencia enviada|enviada a|enviado a|recarga|recargas|compras en|giro|giros)\b/;

interface DateMatch {
  value: number;
  token: string;
}

const toTimestamp = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12) return null;
  const dayCount = new Date(y, m, 0).getDate();
  if (d < 1 || d > dayCount) return null;
  return new Date(y, m - 1, d).getTime();
};

export const extractDate = (line: string): DateMatch | null => {
  let m = line.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (m) {
    const ts = toTimestamp(Number(m[1]), Number(m[2]), Number(m[3]));
    return ts === null ? null : { value: ts, token: m[0] };
  }

  m = line.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const ts = toTimestamp(year, Number(m[2]), Number(m[1]));
    return ts === null ? null : { value: ts, token: m[0] };
  }

  const monthMatch = line.match(
    /\b(\d{1,2})\s+de\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)\s+(?:de\s+)?(\d{4})\b/,
  );
  if (monthMatch) {
    const month = MONTHS[normalizeWord(monthMatch[2])];
    if (month === undefined) return null;
    const ts = toTimestamp(Number(monthMatch[3]), month + 1, Number(monthMatch[1]));
    return ts === null ? null : { value: ts, token: monthMatch[0] };
  }

  m = line.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (m) {
    const now = new Date();
    const ts = toTimestamp(now.getFullYear(), Number(m[2]), Number(m[1]));
    return ts === null ? null : { value: ts, token: m[0] };
  }

  return null;
};

interface AmountMatch {
  value: number;
  token: string;
  start: number;
  end: number;
}

export const parseMoney = (token: string): number | null => {
  let s = token.replace(/[$]/g, "").trim();
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  let value: number;

  if (sepIndex > -1) {
    const right = s.slice(sepIndex + 1);
    if (right.length === 2) {
      // El último separador es decimal; el otro es de miles.
      const thousandsSep = lastComma > lastDot ? "." : ",";
      const integer = s.slice(0, sepIndex).split(thousandsSep).join("");
      value = Number(integer) + Number(right) / 100;
    } else {
      value = Number(s.split(lastComma > lastDot ? "," : ".").join(""));
    }
  } else {
    value = Number(s);
  }

  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
};

export const extractAmounts = (line: string, dateToken?: string | null): AmountMatch[] => {
  const results: AmountMatch[] = [];
  const source = line;
  const visited: boolean[] = new Array(source.length).fill(false);

  const dateStart = dateToken ? source.indexOf(dateToken) : -1;
  const dateEnd =
    dateToken && dateStart !== -1 ? dateStart + dateToken.length : -1;

  const pushMatch = (token: string, start: number, negate: boolean) => {
    const value = parseMoney(token);
    if (value === null) return;
    const end = start + token.length;
    // Ignora tokens que forman parte de la fecha (p. ej. "05" en "02/05/2024").
    if (dateStart !== -1 && start < dateEnd && end > dateStart) return;
    const overlaps = visited.slice(start, end).some(Boolean);
    if (overlaps) return;
    for (let i = start; i < end; i += 1) visited[i] = true;
    results.push({
      value: negate ? -value : value,
      token,
      start,
      end,
    });
  };

  // Negativos entre paréntesis: (150.000)
  const parenthetical = /\((\s*[$]?\s?\d[\d.,]*\s*)\)/g;
  let pm: RegExpExecArray | null;
  while ((pm = parenthetical.exec(source)) !== null) {
    pushMatch(pm[1].trim(), pm.index, true);
  }

  // Números de moneda (con signo opcional).
  const money = /-?[$]?\s?\d[\d.,]*/g;
  let mm: RegExpExecArray | null;
  while ((mm = money.exec(source)) !== null) {
    const token = mm[0].trim();
    if (!token) continue;
    pushMatch(token, mm.index, false);
  }

  return results;
};

const containsKeyword = (line: string, re: RegExp) => re.test(normalizeWord(line));

export const detectType = (
  line: string,
  amount: number,
  hint?: string | null,
): ParsedTransactionType => {
  if (amount < 0) return "expense";
  if (/^\s*\+/.test(line)) return "income";
  if (containsKeyword(line, INCOME_KEYWORDS)) return "income";
  if (containsKeyword(line, EXPENSE_KEYWORDS)) return "expense";
  if (hint && containsKeyword(hint, INCOME_KEYWORDS)) return "income";
  if (hint && containsKeyword(hint, EXPENSE_KEYWORDS)) return "expense";
  return "expense";
};

const cleanDescription = (line: string, removeTokens: string[]): string => {
  let out = line;
  for (const token of removeTokens) {
    if (token) out = out.replace(token, " ");
  }
  out = out
    .replace(/[$]|[\|·•]/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/^[\s\-\*_=.:/\\+()]+/, "")
    .replace(/[\s\-\*_=.:/\\+()]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Si solo quedó puntuación ("+", "-"…), se considera sin descripción.
  if (/^[\+\-*_=.:/\\()|·\s]*$/.test(out)) return "";
  return out;
};

const selectMovementAmount = (
  line: string,
  amounts: AmountMatch[],
): AmountMatch | null => {
  if (amounts.length === 0) return null;
  if (amounts.length === 1) return amounts[0];

  // En tablas con columna SALDO/BALANCE, el último valor suele ser el saldo.
  const hasSaldo = /\b(?:saldo|balance|disponible)\b/i.test(line);
  const candidates = hasSaldo && amounts.length >= 2 ? amounts.slice(0, -1) : amounts;

  const signed = candidates.find((a) => a.value < 0);
  if (signed) return signed;
  // En tablas de DEBITO/CREDITO un "0" es el hueco de la columna opuesta.
  const nonZero = candidates.find((a) => a.value !== 0);
  if (nonZero) return nonZero;
  return candidates[0];
};

interface LineContext {
  pendingDescription: string | null;
}

const parseLine = (
  line: string,
  ctx: LineContext,
): ParsedTransaction | null => {
  const date = extractDate(line);
  const amounts = extractAmounts(line, date?.token ?? null);
  if (amounts.length === 0) return null;

  const movement = selectMovementAmount(line, amounts);
  if (!movement) return null;
  const type = detectType(line, movement.value, ctx.pendingDescription);

  let description = cleanDescription(line, [
    date?.token ?? "",
    ...amounts.map((a) => a.token),
  ]);
  if (!description && ctx.pendingDescription) {
    description = ctx.pendingDescription;
  }

  const confidence: ParsedTransaction["confidence"] =
    date && movement.value !== null && description ? "high" : "medium";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date?.value ?? null,
    amount: movement.value,
    type,
    description: description || (type === "income" ? "Ingreso" : "Movimiento"),
    confidence,
  };
};

export const parseStatement = (text: string): StatementParseResult => {
  const rawLines = text
    .replace(/\u00A0/g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim());

  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];
  const ctx: LineContext = { pendingDescription: null };

  for (const line of rawLines) {
    if (!line) continue;
    if (isSeparatorLine(line)) continue;

    const normalized = normalizeWord(line);
    if (HEADER_ONLY.test(normalized) || HEADER_COLUMNS.test(normalized)) {
      ctx.pendingDescription = null;
      continue;
    }

    const parsed = parseLine(line, ctx);

    if (parsed) {
      // Si la línea ya aporta una descripción, limpia la pendiente.
      if (parsed.description && !/^(?:Movimiento|Ingreso)$/.test(parsed.description)) {
        ctx.pendingDescription = null;
      }
      candidates.push(parsed);
      continue;
    }

    // Línea sin fecha/valor: posible descripción del siguiente movimiento
    // (estilo pantallazo de app: "Compra en X" y debajo "-$50.000").
    const hasDigits = /\d/.test(line);
    if (!hasDigits && line.length <= 60) {
      ctx.pendingDescription = line;
      continue;
    }

    if (hasDigits && !/\b(?:pagina)\b/i.test(line)) {
      unparsedLines.push(line);
    }
  }

  // Segundo pase: candidatos sin descripción usan la pendiente.
  for (const candidate of candidates) {
    if (!candidate.description || /^(?:Movimiento|Ingreso)$/.test(candidate.description)) {
      candidate.description = "Movimiento";
    }
  }

  return { candidates, unparsedLines };
};
