// services/ai/statementParser.ts
//
// Parseo 100% local de movimientos bancarios a partir del texto OCR ya
// redactado. Nunca se envía este texto a la IA. Los resultados son
// "candidatos" que el usuario debe verificar antes de guardarlos.
//
// Estrategia (por FORMATO, no por columnas fijas):
//   Cada banco distribuye las columnas distinto, así que no se asumen
//   posiciones. En cada fila se clasifican las celdas por su forma:
//     - la que parece una fecha  -> fecha
//     - la que parece un monto   -> valor (y la última suele ser el saldo)
//     - las demás                -> descripción
//   Esto funciona igual para PDF con capa de texto, escaneos (OCR) y
//   capturas de pantalla de apps.

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
  /** Número de página (o imagen) del que proviene; default 1. */
  page: number;
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

// Meses abreviados ("27 JUL 2026", "24 AGO").
const MONTHS_SHORT: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
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

// Filas de resumen/totales del extracto: "SALDO CIERRE MES ANTERIOR | ...",
// "+ ABONOS | ...", "- CARGOS | ...", "- 4 POR MIL | ...", "SALDO FINAL | ...",
// y en tarjetas: "PAGO MÍNIMO ...", "TOTAL A PAGAR ...", "RESTANTE ...".
const SUMMARY_ROW =
  /^(?:[+\-]\s*)?(?:saldo\s+(?:cierre|inicial|anterior|final|actual|disponible|promedio)|abonos?|cargos?|intereses?\s+(?:recibidos|pagados)|4\s*por\s*mil|iva|retenciones?|total(?:es)?|subtotal|disponible|balance|comisiones?|impuestos?|pago\s*(?:minimo|mínimo)|pago\s+del\s+mes|fecha\s+de\s+(?:corte|vencimiento)|total\s+a\s+pagar|restante|cuota\s+(?:de\s+manejo|del\s+mes)|interes(?:és)?\s+del\s+mes|porcentaje\s+y\s+valor|por\s+pagar|deuda\s+total|cuotas?\s+(?:al\s+dia|pendientes|del\s+mes|por\s+pagar))\b/i;

// Encabezado de columnas en tablas con separador "|" (tarjetas y extractos
// multicolumna): "Fecha | Descripción | Valor | Cuotas | Valor | Interés del
// mes | Total a pagar | Restante". Solo aplica a líneas SIN montos ni fechas
// (una fila real siempre trae al menos uno de los dos).
const COLUMN_HEADER_WORDS =
  /\b(?:fecha|descripcion|detalle|valor|monto|importe|cuota(s)?|interes\s+del\s+mes|total\s+a\s+pagar|saldo|debito|credito|abono|cargo|restante|por\s+pagar|del\s+mes|porcentaje\s+y\s+valor)\b/i;

// Año suelto ("2026") que el OCR dejó como línea propia: no es un movimiento.
const isYearOnly = (line: string) => /^(?:19|20)\d{2}$/.test(line.trim());

const isSeparatorLine = (line: string) => /^[\s|\-*=._]+$/.test(line);

// Keywords que delatan ingresos. "credito/creditos" se omite a propósito:
// "PAGO DE TARJETA DE CREDITO" es un egreso, no un ingreso. La columna
// CREDITO de las tablas se detecta aparte con `isCreditColumn`.
const INCOME_KEYWORDS =
  /\b(?:nomina|ingreso|ingresos|abono|abonos|consignacion|consignaciones|deposito|depositos|recibida|recibido|transferencia recibida|devolucion|devoluciones|ajuste a favor|intereses ganados|pago de nomina|credito a|credito por)\b/;

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

export interface StatementPeriod {
  /** Inicio del periodo (timestamp ms). */
  from: number;
  /** Fin del periodo (timestamp ms). */
  to: number;
  /** Texto original de la fecha de inicio. */
  fromText: string;
  /** Texto original de la fecha de fin. */
  toText: string;
}

export interface DateParseOptions {
  /** Año por defecto (el más frecuente del extracto). */
  year?: number;
  /** Periodo del extracto, para completar el año lógico de fechas sin año. */
  period?: StatementPeriod | null;
}

// ¿El token de fecha trae año explícito ("2024", "2024/03/31", "27 JUL 2026")?
const hasExplicitYear = (token: string): boolean => /\d{4}/.test(token);

// Encuentra los tokens de fecha (con o sin año) en una línea, en orden.
const findDateTokens = (line: string): string[] => {
  const tokens: string[] = [];
  const re =
    /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+de\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+\s+(?:de\s+)?\d{4}|\d{1,2}\s+[a-zA-Z]{3}\s+\d{4}|\d{1,2}\s+[a-zA-Z]{3}|\d{1,2}[-/]\d{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) tokens.push(m[0]);
  return tokens;
};

// Resuelve el año lógico de una fecha sin año ("1/04", "24 JUL") dentro del
// periodo del extracto. Si el periodo cruza de año (p.ej. 31/12/2023 a
// 13/03/2024), elige el año que mantiene la fecha DENTRO del rango.
const resolveYearForDate = (
  day: number,
  month: number,
  opts?: DateParseOptions,
): number => {
  const period = opts?.period;
  if (period) {
    const from = new Date(period.from);
    const to = new Date(period.to);
    const fromYear = from.getFullYear();
    const toYear = to.getFullYear();
    const y1 = new Date(fromYear, month - 1, day).getTime();
    const y2 = new Date(toYear, month - 1, day).getTime();
    if (y1 >= period.from && y1 <= period.to) return fromYear;
    if (y2 >= period.from && y2 <= period.to) return toYear;
    // Ninguna cae exactamente dentro: se usa la más cercana al inicio del
    // periodo (los movimientos van en orden cronológico desde `from`).
    return Math.abs(y1 - period.from) <= Math.abs(y2 - period.to)
      ? fromYear
      : toYear;
  }
  return opts?.year ?? new Date().getFullYear();
};

// Completa el timestamp de la fecha de FIN del rango. Si no trae año explícito
// ("28 JUL"), se usa el año del inicio; si queda ANTES del inicio, rueda al año
// siguiente (p.ej. periodo "Nov 2023 - Ene").
const resolveEndTimestamp = (
  token: string,
  fromYear: number,
  fromValue: number,
): number | null => {
  if (hasExplicitYear(token)) {
    return extractDate(token)?.value ?? null;
  }
  let ts = extractDate(token, { year: fromYear })?.value ?? null;
  if (ts !== null && ts < fromValue) {
    ts = extractDate(token, { year: fromYear + 1 })?.value ?? null;
  }
  return ts;
};

// Detecta el periodo (rango de fechas) del extracto:
//   "31/12/2023 a 13/03/2024", "DESDE: 2024/03/31 | HASTA: 2024/06/30",
//   "Periodo facturado 28 JUN 2026 - 28 JUL", "período de: 2026/01/01 a 2026/01/31".
// El rango se usa para completar el AÑO lógico de cada fecha sin año.
export const detectStatementPeriod = (
  text: string,
): StatementPeriod | null => {
  const t = text.replace(/\u00A0/g, " ");
  const lines = t.split(/\r?\n/);

  const RANGE_LINE =
    /(?:desde|hasta|periodo|period|per[ií]odo|facturado|rango|fecha\s+de\s+corte)/i;
  const RANGE_BETWEEN =
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+de\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+\s+(?:de\s+)?\d{4}|\d{1,2}\s+[a-zA-Z]{3}\s+\d{4})\s*(?:\s*(?:al|a|hasta|-|—|–)\s*)(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+de\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+\s+(?:de\s+)?\d{4}|\d{1,2}\s+[a-zA-Z]{3}(?:\s+\d{4})?)/i;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;

    // Rango directo entre dos fechas: "31/12/2023 a 13/03/2024".
    const between = RANGE_BETWEEN.exec(line);
    if (between) {
      const from = extractDate(between[1]);
      if (!from) continue;
      const fromYear = new Date(from.value).getFullYear();
      const to = resolveEndTimestamp(between[2], fromYear, from.value);
      if (to !== null && to >= from.value) {
        return {
          from: from.value,
          to,
          fromText: between[1],
          toText: between[2],
        };
      }
    }

    // Línea con palabra clave de rango y al menos dos fechas.
    if (!RANGE_LINE.test(line)) continue;
    const tokens = findDateTokens(line);
    if (tokens.length < 2) continue;
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    if (!hasExplicitYear(first)) continue;
    const from = extractDate(first);
    if (!from) continue;
    const fromYear = new Date(from.value).getFullYear();
    const to = resolveEndTimestamp(last, fromYear, from.value);
    if (to !== null && to >= from.value) {
      return {
        from: from.value,
        to,
        fromText: first,
        toText: last,
      };
    }
  }

  // Respaldo: el rango es el mínimo y el máximo de todas las fechas con año
  // explícito del documento, si están razonablemente cerca (<= 13 meses).
  const explicit: { value: number; token: string }[] = [];
  for (const raw of lines) {
    for (const token of findDateTokens(raw)) {
      if (!hasExplicitYear(token)) continue;
      const d = extractDate(token);
      if (d) explicit.push({ value: d.value, token });
    }
  }
  if (explicit.length >= 2) {
    const sorted = explicit.sort((a, b) => a.value - b.value);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (last.value - first.value <= 400 * 24 * 60 * 60 * 1000) {
      return {
        from: first.value,
        to: last.value,
        fromText: first.token,
        toText: last.token,
      };
    }
  }
  return null;
};

export const extractDate = (
  line: string,
  opts?: DateParseOptions,
): DateMatch | null => {
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

  // Fecha con puntos: "1.04.2024".
  m = line.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
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
    const ts = toTimestamp(
      Number(monthMatch[3]),
      month + 1,
      Number(monthMatch[1]),
    );
    return ts === null ? null : { value: ts, token: monthMatch[0] };
  }

  // Mes abreviado con año: "27 JUL 2026".
  m = line.match(/\b(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})\b/);
  if (m) {
    const month = MONTHS_SHORT[normalizeWord(m[2])];
    if (month !== undefined) {
      const ts = toTimestamp(Number(m[3]), month + 1, Number(m[1]));
      return ts === null ? null : { value: ts, token: m[0] };
    }
  }

  // Mes abreviado con año separado por guion: "10-ENE-2024", "10-ENE-24".
  m = line.match(/\b(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})\b/);
  if (m) {
    const month = MONTHS_SHORT[normalizeWord(m[2])];
    if (month !== undefined) {
      let year = Number(m[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
      const ts = toTimestamp(year, month + 1, Number(m[1]));
      return ts === null ? null : { value: ts, token: m[0] };
    }
  }

  // Mes abreviado con guion sin año: "10-ene" (año del periodo o del extracto).
  m = line.match(/\b(\d{1,2})[-/]([a-zA-Z]{3})\b/);
  if (m) {
    const month = MONTHS_SHORT[normalizeWord(m[2])];
    if (month !== undefined) {
      const year = resolveYearForDate(Number(m[1]), month + 1, opts);
      const ts = toTimestamp(year, month + 1, Number(m[1]));
      return ts === null ? null : { value: ts, token: m[0] };
    }
  }

  // Mes abreviado sin año: "24 JUL" (año del periodo o del extracto).
  m = line.match(/\b(\d{1,2})\s+([a-zA-Z]{3})\b/);
  if (m) {
    const month = MONTHS_SHORT[normalizeWord(m[2])];
    if (month !== undefined) {
      const year = resolveYearForDate(Number(m[1]), month + 1, opts);
      const ts = toTimestamp(year, month + 1, Number(m[1]));
      return ts === null ? null : { value: ts, token: m[0] };
    }
  }

  // "1/04", "25-06" (dd/mm sin año): se usa el año del periodo o del extracto.
  m = line.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (m) {
    const year = resolveYearForDate(Number(m[1]), Number(m[2]), opts);
    const ts = toTimestamp(year, Number(m[2]), Number(m[1]));
    return ts === null ? null : { value: ts, token: m[0] };
  }

  return null;
};

export const parseMoney = (token: string): number | null => {
  let s = token.replace(/[$]/g, "").trim();
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/\s/g, "");
  // Corrección de dígitos mal leídos por el OCR ("-l63, 618.00", "-990.0o").
  s = normalizeOcrDigits(s);
  // Artefactos del OCR al final del monto: "1,219,525.5:", "819,525.5.",
  // "221,140.1€", "256,289.5E", "-990.0o". Se limpian para no perder la fila.
  s = s.replace(/[^0-9.,]+$/, "").replace(/\.+$/, "");
  // El OCR a veces pierde el cero inicial de los intereses: ".77" -> "0.77".
  if (/^\.\d/.test(s)) s = `0${s}`;
  if (!s || !/^\d[\d.,]*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  let value: number;

  if (sepIndex > -1) {
    const right = s.slice(sepIndex + 1);
    if (/^\d{1,2}$/.test(right)) {
      // El último separador es DECIMAL (1 o 2 dígitos: "1,219,525.52",
      // "626.572,00", "461,864.1"). El otro separador es de miles y se quita.
      // Se reconstruye la cadena decimal y se parsea con Number() para NO
      // acumular error de punto flotante ("1.39" -> 1.39, no 1.3900000000000001).
      const thousandsSep = lastComma > lastDot ? "." : ",";
      let integer = s
        .slice(0, sepIndex)
        .split(thousandsSep)
        .join("");
      // "705,938..6" (doble punto del OCR): se quita el punto sobrante.
      integer = integer.replace(/\.+$/, "");
      value = Number(`${integer}.${right}`);
    } else {
      // El último separador es de MILES ("123.456", "1,234,567"): se quitan
      // todos los separadores del mismo tipo y se parsea como entero.
      const lastSep = lastComma > lastDot ? "," : ".";
      value = Number(s.split(lastSep).join(""));
    }
  } else {
    value = Number(s);
  }

  if (!Number.isFinite(value)) return null;
  // Redondeo de seguridad a 2 decimales (los montos no tienen más).
  value = Math.round(value * 100) / 100;
  return negative ? -value : value;
};

// ---------------------------------------------------------------------------
// Clasificación por FORMATO de cada celda de una fila.
// ---------------------------------------------------------------------------

// ¿Toda la celda es una fecha? "01-06-2026", "1/06/2026", "2026-06-01",
// "5 de julio de 2026", "27 JUL 2026", "24 JUL".
// También se acepta una fecha con HORA pegada en la misma celda, típica de
// páginas de continuación de extractos: "10/01/2024 14:30", "27 JUL 2026 09:15
// AM". Sin esto, una fila con fecha+hora NO se reconoce como fecha y el
// movimiento pierde su fecha.
const isDateCellBase = (c: string): boolean => {
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(c)) return true;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(c)) return true;
  // Fecha con puntos: "1.04.2024".
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(c)) return true;
  if (/^\d{1,2}\s+de\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+\s+(?:de\s+)?\d{4}$/.test(c))
    return true;
  if (/^\d{1,2}\s+[a-zA-Z]{3}(?:\s+\d{4})?$/.test(c)) return true;
  // Mes abreviado con guion: "10-ENE-2024", "10-ENE-24", "10-ene" (sin año).
  if (/^\d{1,2}[-/][a-zA-Z]{3}(?:[-/]\d{2,4})?$/.test(c)) return true;
  // "1/04", "25-06" (dd/mm sin año; el año se completa con el del extracto).
  if (/^\d{1,2}[-/]\d{1,2}$/.test(c)) return true;
  return false;
};

const isDateCell = (cell: string): boolean => {
  const c = cell.trim();
  if (isDateCellBase(c)) return true;
  // Quita el sufijo de hora ("10/01/2024 14:30:45 PM") y vuelve a probar.
  const withoutTime = c.replace(
    /[\s•·]+(?:\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[aApP]\.?[mM]\.?)?$/,
    "",
  );
  return withoutTime !== c && isDateCellBase(withoutTime);
};

// ¿Toda la línea es una fecha (con o sin hora)? "2026-06-01 10:30 AM",
// "01/06/2026 14:00", "27 JUL 2026". Usada para detectar la fecha suelta de
// un bloque.
const isDateOnlyLine = (line: string): boolean => {
  const c = line.trim();
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?:\s*[aApP][mM])?)?$/.test(
      c,
    )
  )
    return true;
  if (
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}(?:\s*[aApP][mM])?)?$/.test(
      c,
    )
  )
    return true;
  if (/^\d{1,2}\s+[a-zA-Z]{3}(?:\s+\d{4})?$/.test(c)) return true;
  return false;
};

// ¿Toda la celda parece un monto? Debe llevar separador (miles o decimales):
// "50.00", "2,096,424.50", "626.572,00". Un entero pelado ("2376", "1", "23")
// NO se considera monto (suele ser número de secuencia o contador).
// El OCR confunde dígitos con letras: "l63, 618.00" (l=1), "-990.0o" (o=0),
// "TOTAL ABONOs". Solo se usa al CLASIFICAR/parsear montos; el texto original
// de las descripciones no se toca.
const normalizeOcrDigits = (s: string) =>
  s.replace(/[lI]/g, "1").replace(/[oO]/g, "0");

const isMoneyCell = (cell: string): boolean => {
  const c = normalizeOcrDigits(cell.trim());
  if (!c) return false;
  // Debe empezar con dígito (o punto decimal) tras un posible signo/$; el OCR
  // puede dejar ruido al final (":", ".", letras) que `parseMoney` limpia, así
  // que no se exige que el string termine exactamente en la parte numérica.
  if (!/^[+\-]?\$?\s?[+\-]?(?:\d|\.\d)[\d\s.,]/.test(c)) return false;
  if (!/[.,]/.test(c)) return false;
  return parseMoney(c) !== null;
};

// Entero sin separador que PUEDE ser un monto: el OCR de escaneos suele
// devolver "50000" en vez de "50.000". Se considera solo si tiene 5+ dígitos
// (descarta años como "2026" y números de secuencia cortos) y NO empieza con
// cero (descarta teléfonos tipo "00918522756").
const isBareIntegerCell = (cell: string): boolean =>
  /^[1-9]\d{4,}$/.test(cell.trim());

// ¿La celda es solo un entero (número de secuencia / contador)?
const isIntegerCell = (cell: string): boolean => /^\d+$/.test(cell.trim());

interface Cell {
  text: string;
  isDate: boolean;
  isMoney: boolean;
}

// Divide una fila en celdas. El texto extraído por PDF.js llega con columnas
// separadas por "|". El texto de OCR (escaneos) llega sin separadores, así que
// se divide por palabras y cada palabra se clasifica por su forma.
// En texto sin separadores (OCR), un entero largo ("50000") SÍ es monto;
// en tablas con "|", un entero pelado suele ser número de secuencia.
const classifyCells = (line: string): Cell[] => {
  const hasSeparators = line.includes("|");
  const parts = hasSeparators ? line.split("|") : line.split(/\s+/);
  return parts.map((part) => {
    const text = part.trim();
    if (!text) return { text, isDate: false, isMoney: false };
    const isDate = isDateCell(text);
    // Una celda de fecha NUNCA es monto ("1.04.2024" no debe contarse como
    // valor, aunque `parseMoney` la leería como un número grande).
    const isMoney =
      !isDate &&
      (isMoneyCell(text) || (!hasSeparators && isBareIntegerCell(text)));
    return { text, isDate, isMoney };
  });
};

const containsKeyword = (line: string, re: RegExp) =>
  re.test(normalizeWord(line));

// Detecta descripciones de TRANSFERENCIA SALIENTE (dinero que sale de la
// cuenta del extracto hacia otra cuenta o persona): "Transferio a: …",
// "Transferencia a: …", "TRANSF A OTROS BANCOS", "Enviado a …", "Giro a …".
// Se usa en la verificación para pre-seleccionar el tipo "transferencia" y que
// el usuario elija la cuenta destino (entre sus cuentas) o a otra persona.
// Una "Transferencia recibida" (ingreso) NO se marca como transferencia.
export const isOutgoingTransferDescription = (description: string): boolean => {
  const d = normalizeWord(description ?? "");
  // Se usa \s* (no \s+) para tolerar OCR que pega las palabras
  // ("Transferenciaa: …", "Enviadoa …").
  return /(?:transferencia\s*(?:a|enviad[oa]\s*(?:a|para))|transfer(?:io|í|ido|ir|o)\s*(?:a|para)|transf\s*(?:a|para)|transfir(?:io|ió)\s*(?:a|para)|enviad[oa]\s*(?:a|para)|giro\s*(?:a|para))/.test(
    d,
  );
};

// ---------------------------------------------------------------------------
// Instituciones bancarias mencionadas en una descripción de transferencia.
// Los bancos NO son datos personales: se conservan (no se redactan) y sirven
// para vincular la transferencia con una cuenta del usuario en la verificación
// ("Transferencia a: Bancolombia" → pre-seleccionar la cuenta Bancolombia).
// Las entradas con nombres largos van primero para que el alternador las
// prefiera sobre prefijos cortos ("Nubank" antes que "Nu").
// ---------------------------------------------------------------------------
const BANK_NAMES = [
  "Bank of America",
  "Bank of Scotland",
  "Banco Popular",
  "Banco Agrario",
  "Banco Cusco",
  "Goldman Sachs",
  "Wells Fargo",
  "JPMorgan",
  "Citigroup",
  "Santander",
  "Barclays",
  "Bancolombia",
  "Davivienda",
  "Banamex",
  "Banorte",
  "BANSEFI",
  "Bantrust",
  "Bancamia",
  "Coopcentral",
  "Bradesco",
  "Nubank",
  "Revolut",
  "Nu",
  "BRE-B",
  "Nequi",
  "BBVA",
  "HSBC",
  "Lloyds",
  "ING",
  "Itau",
  "Caixa",
];

export const BANK_NAME_PATTERN = new RegExp(
  `\\b(${BANK_NAMES.join("|")})\\b`,
  "gi",
);

const BANK_NAME_FULL = new RegExp(
  `^\\s*(${BANK_NAMES.join("|")})\\s*$`,
  "i",
);

// ¿El texto es exactamente el nombre de un banco conocido? (para NO redactar
// la institución cuando aparece como destinatario de una transferencia).
export const isBankName = (name: string): boolean =>
  BANK_NAME_FULL.test(name ?? "");

// Extrae el banco mencionado en una descripción ("Transferencia a: Nequi").
export const extractMentionedBank = (description: string): string | null => {
  const m = (description ?? "").match(BANK_NAME_PATTERN);
  return m ? m[0] : null;
};

export const detectType = (
  line: string,
  amount: number,
  hint?: string | null,
  isCreditColumn?: boolean,
): ParsedTransactionType => {
  if (amount < 0) return "expense";
  if (/^\s*\+/.test(line)) return "income";
  if (containsKeyword(line, INCOME_KEYWORDS)) return "income";
  if (containsKeyword(line, EXPENSE_KEYWORDS)) return "expense";
  if (isCreditColumn) return "income";
  if (hint && containsKeyword(hint, INCOME_KEYWORDS)) return "income";
  if (hint && containsKeyword(hint, EXPENSE_KEYWORDS)) return "expense";
  return "expense";
};

const cleanDescription = (text: string): string => {
  let out = text
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

// Elige el valor del movimiento entre las celdas de tipo monto.
// Convención colombiana habitual: en las tablas la última columna de dinero
// es el SALDO; el valor del movimiento es el monto anterior (o el único).
const selectAmountCell = (
  cells: Cell[],
): { amount: number; isCreditColumn: boolean } | null => {
  // Si no hay montos con separador, prueba enteros largos (OCR de escaneos
  // devuelve "50000" sin separadores). Solo cuando la fila no tiene una mezcla
  // rara con secuencias.
  const money = cells.filter((c) => c.isMoney);
  if (money.length === 0) {
    const bare = cells.filter((c) => isBareIntegerCell(c.text) && !c.isDate);
    if (bare.length > 0) {
      return selectFromMoneyCells(bare);
    }
    return null;
  }
  return selectFromMoneyCells(money);
};

const selectFromMoneyCells = (
  money: Cell[],
): { amount: number; isCreditColumn: boolean } | null => {
  if (money.length === 0) return null;

  const valueOf = (c: Cell) => parseMoney(c.text) ?? 0;

  if (money.length === 1) {
    const amount = valueOf(money[0]);
    if (amount === 0) return null;
    return { amount, isCreditColumn: false };
  }

  if (money.length === 2) {
    const a = valueOf(money[0]);
    const b = valueOf(money[1]);
    // Tabla DEBITO | CREDITO (sin saldo): un "0" es el hueco de la columna
    // opuesta. La columna con valor es el movimiento.
    if (a === 0 && b !== 0) return { amount: b, isCreditColumn: true };
    if (b === 0 && a !== 0) return { amount: a, isCreditColumn: false };
    // Monto + Saldo: el último es el saldo, el anterior el movimiento.
    if (a !== 0) return { amount: a, isCreditColumn: false };
    return null;
  }

  // 3+ montos (DEBITO | CREDITO | SALDO o similar): el último es el saldo.
  const candidates = money.slice(0, -1);
  for (let i = 0; i < candidates.length; i += 1) {
    const amount = valueOf(candidates[i]);
    if (amount !== 0) {
      // En DEBITO|CREDITO, la segunda columna suele ser el crédito.
      return { amount, isCreditColumn: i === candidates.length - 1 };
    }
  }
  return null;
};

// ¿Es una hora ("10:30 AM", "14:00") o un fragmento de fecha suelto que se
// coló en la descripción? Se descartan para no mezclar fecha con descripción.
const isTimeFragment = (cell: string): boolean =>
  /^\d{1,2}:\d{2}(?:\s*[aApP]\.?[mM]\.?)?$/.test(cell.trim()) ||
  /^[aApP]\.?[mM]\.?$/.test(cell.trim());

// Palabras cortas de ruido típicas de capturas (código de país "CO", etc.)
// que no aportan a la descripción.
const isNoiseWord = (word: string): boolean =>
  /^(CO|COL|S\.A\.?S?|LTDA|C\.?A\.?|E\.?U\.?)$/i.test(word.trim());

const buildDescription = (cells: Cell[]): string => {
  const parts = cells
    .filter((c) => !c.isDate && !c.isMoney)
    .filter((c) => c.text.length > 0)
    .map((c) => c.text);
  // Descarta celdas que son solo números de secuencia, horas, fragmentos o
  // ruido corto.
  const meaningful = parts.filter((p) => {
    if (isIntegerCell(p)) return false;
    if (isTimeFragment(p)) return false;
    if (isDateCell(p)) return false;
    if (isNoiseWord(p)) return false;
    return true;
  });
  return cleanDescription(meaningful.join(" "));
};

const makeCandidate = (
  date: DateMatch | null,
  amount: number,
  type: ParsedTransactionType,
  description: string,
): ParsedTransaction => {
  // FIX 1: Forzamos el signo correcto según el tipo
  const finalAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount);
  const confidence: ParsedTransaction["confidence"] =
    date && amount !== null && description ? "high" : "medium";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date?.value ?? null,
    amount: finalAmount,
    type,
    description: description || (type === "income" ? "Ingreso" : "Movimiento"),
    confidence,
    page: 1,
  };
};

/**
 * Clasifica una LÍNEA suelta (modo manual de verificación) como un movimiento
 * candidato. Usa la misma clasificación por FORMA que `parseStatement`: lo que
 * parece fecha → fecha, lo que parece monto → monto, lo demás → descripción.
 * Devuelve null para líneas sin valor ni fecha (encabezados, separadores,
 * resúmenes, texto suelto) para que el usuario no las toque por error.
 */
export const parseLine = (line: string): ParsedTransaction | null => {
  if (!line) return null;
  if (isSeparatorLine(line)) return null;

  const normalized = normalizeWord(line);
  if (HEADER_ONLY.test(normalized) || HEADER_COLUMNS.test(normalized))
    return null;

  const cells = classifyCells(line);
  const hasMoney = cells.some((c) => c.isMoney);
  const hasDate = cells.some((c) => c.isDate);
  if (!hasMoney && !hasDate) return null;

  if (hasMoney && !hasDate && SUMMARY_ROW.test(normalized)) return null;

  const dateCell = cells.find((c) => c.isDate);
  const date = dateCell ? extractDate(dateCell.text) : null;

  let amount: number | null = null;
  let type: ParsedTransactionType = "expense";
  if (hasMoney) {
    const selected = selectAmountCell(cells);
    if (selected) {
      amount = selected.amount;
      type = detectType(line, selected.amount, null, selected.isCreditColumn);
    }
  }

  const description = buildDescription(cells);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: date?.value ?? null,
    amount,
    type,
    description: description || (type === "income" ? "Ingreso" : "Movimiento"),
    confidence: date && amount !== null && description ? "high" : "medium",
    page: 1,
  };
};

const parseLines = (
  lines: string[],
  opts?: { leadingDates?: boolean; year?: number; period?: StatementPeriod | null },
): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];
  // Estado para armar "bloques" de varias líneas (pantallazos de app y OCR de
  // escaneos): la descripción, el valor y la fecha pueden venir en líneas
  // separadas. p.ej.:
  //   "CARGO POR IMPUESTO 4X1.000"   <- descripción
  //   "50.00"                        <- valor
  //   "01-06-2026"                   <- fecha
  // La descripción puede ocupar varias líneas ("Pago recibido", "Juan Perez
  // te pago", …), así que se acumula en un arreglo.
  let pendingLines: string[] = [];
  let pendingDate: number | null = null;

  const pendingDescription = () => {
    if (pendingLines.length === 0) return "";
    const words = pendingLines
      .join(" ")
      .split(/\s+/)
      .filter((w) => !isNoiseWord(w));
    return cleanDescription(words.join(" "));
  };

  const resetBlock = () => {
    pendingLines = [];
    pendingDate = null;
  };

  for (const line of lines) {
    if (!line) continue;
    if (isSeparatorLine(line)) continue;
    if (isYearOnly(line)) continue;

    const normalized = normalizeWord(line);
    if (HEADER_ONLY.test(normalized) || HEADER_COLUMNS.test(normalized)) {
      resetBlock();
      continue;
    }

    const cells = classifyCells(line);
    const hasMoney = cells.some((c) => c.isMoney);
    const hasDate = cells.some((c) => c.isDate);
    const hasSeparators = line.includes("|");
    const dateCell = cells.find((c) => c.isDate);
    const date = dateCell
      ? extractDate(dateCell.text, { year: opts?.year, period: opts?.period })
      : null;

    // Encabezado de columnas de una tabla con "|" ("Fecha | Descripción |
    // Valor | Cuotas | …"): sin montos ni fechas no es una fila de datos.
    if (
      hasSeparators &&
      !hasMoney &&
      !hasDate &&
      COLUMN_HEADER_WORDS.test(normalized)
    ) {
      resetBlock();
      continue;
    }

    // Filas de resumen/totales: tienen montos pero NO fecha de transacción
    // ("SALDO FINAL 120.383,48", "+ ABONOS 626.572,00"). Una descripción que
    // empiece con "CARGO" o "SALDO" pero sin montos NO es resumen.
    if (hasMoney && !hasDate && SUMMARY_ROW.test(normalized)) {
      resetBlock();
      continue;
    }

    // Línea con valor Y fecha en la misma fila: fila de tabla clásica.
    if (hasMoney && hasDate) {
      const selected = selectAmountCell(cells);
      if (selected) {
        const description = buildDescription(cells) || pendingDescription();
        const type = detectType(
          line,
          selected.amount,
          pendingDescription(),
          selected.isCreditColumn,
        );
        candidates.push(
          makeCandidate(date, selected.amount, type, description),
        );
      }
      resetBlock();
      continue;
    }

    // Línea con valor pero sin fecha: puede ser una fila (con descripción) o
    // el valor suelto de un bloque de pantallazo. Usa la fecha pendiente si la
    // había (fecha "de apertura" del bloque) o la fecha incrustada en la fila.
    if (hasMoney) {
      const selected = selectAmountCell(cells);
      if (selected) {
        const inlineDescription = buildDescription(cells);
        const description = inlineDescription || pendingDescription();
        const type = detectType(
          line + " " + description,
          selected.amount,
          pendingDescription(),
          selected.isCreditColumn,
        );
        let date =
          pendingDate !== null ? { value: pendingDate, token: "" } : null;
        // Fecha que el OCR dejó incrustada en la fila pero que no se reconoció
        // como celda de fecha: "1.04.2024 COMPRA ...".
        if (!date) {
          const embedded = extractDate(line, {
            year: opts?.year,
            period: opts?.period,
          });
          if (embedded) date = embedded;
        }
        candidates.push(
          makeCandidate(date, selected.amount, type, description),
        );
      }
      resetBlock();
      continue;
    }

    // Línea con fecha pero sin valor: fecha suelta de un bloque. En los
    // pantallazos la fecha suele venir DESPUÉS del valor (trailing), así que si
    // el último candidato aún no tiene fecha se le asigna. Si ya la tiene,
    // se guarda como pendiente para el siguiente candidato (fecha "de
    // apertura" del bloque). En tablas (leadingDates, modelo por formato) la
    // fecha suelta SIEMPRE es "de apertura" del bloque siguiente.
    if (isDateOnlyLine(line)) {
      const d = extractDate(line, { year: opts?.year, period: opts?.period });
      if (d) {
        if (!opts?.leadingDates) {
          const last = candidates[candidates.length - 1];
          if (last && last.date === null) {
            last.date = d.value;
            if (last.confidence !== "high") last.confidence = "high";
            continue;
          }
        }
        pendingDate = d.value;
      }
      continue;
    }

    // Línea con fecha y descripción pero sin valor: el valor viene en otra
    // línea ("01/06/2026 COMPRA EN METRO" y abajo "50.00"). Se guarda la fecha
    // pendiente y la descripción.
    if (hasDate && !hasMoney) {
      if (date) pendingDate = date.value;
      const descCells = cells.filter((c) => !c.isDate);
      const desc = buildDescription(descCells);
      if (desc) pendingLines.push(desc);
      else
        pendingLines.push(
          line.replace(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g, " ").trim(),
        );
      continue;
    }

    // Línea de solo texto: parte de la descripción de un bloque. Puede incluir
    // dígitos ("CARGO POR IMPUESTO 4X1.000", "PAGO *5255"), así que solo se
    // descarta si parece una fila con montos sin interpretar. Si la redacción
    // dejó una etiqueta repetida ("Pago recibido" original + "Pago recibido"
    // generada), se evita duplicarla.
    if (!hasMoney && !hasDate && line.length <= 60) {
      const lastPending = pendingLines[pendingLines.length - 1];
      const prevPending = pendingLines[pendingLines.length - 2];
      // Evita "X ... X" (misma etiqueta repetida separada por una palabra
      // corta de ruido tipo "CO").
      if (
        lastPending !== line &&
        !(prevPending === line && line.length <= 24)
      ) {
        pendingLines.push(line);
      }
      continue;
    }

    // Líneas con montos o fechas que no formaron un movimiento se reportan
    // como "sin interpretar" para que el usuario las revise.
    if (hasMoney || hasDate) {
      unparsedLines.push(line);
    }
  }

  // Asigna las fechas pendientes a los candidatos que quedaron sin fecha.
  // Recorre hacia atrás: cada fecha pendiente corresponde al último candidato
  // que aún no tiene fecha (el orden de lectura es de arriba hacia abajo).
  let pending = pendingDate;
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    if (candidates[i].date !== null) continue;
    if (pending === null) continue;
    candidates[i].date = pending;
    if (candidates[i].confidence !== "high") {
      candidates[i].confidence = "high";
    }
    pending = null;
  }

  // Segundo pase: candidatos sin descripción usan la pendiente.
  for (const candidate of candidates) {
    if (
      !candidate.description ||
      /^(?:Movimiento|Ingreso)$/.test(candidate.description)
    ) {
      candidate.description = "Movimiento";
    }
  }

  return { candidates, unparsedLines };
};

// ---------------------------------------------------------------------------
// Modelos de análisis POR FORMATO
//
// Cada banco tiene una estructura propia (encabezados, columnas, resúmenes).
// Aquí se detecta el formato por "huella" y se aplican reglas de extracción
// específicas; si el modelo no reconoce nada, se cae al parser genérico.
// Si el banco cambia su formato, se crea/ajusta su modelo (no se entrena nada:
// son reglas deterministas).
// ---------------------------------------------------------------------------

export type StatementFormat =
  | "bbva"
  | "bbva_app"
  | "bancolombia"
  | "nu"
  | "nequi"
  | "nequi_pdf"
  | null;

export const detectFormat = (text: string): StatementFormat => {
  const t = text.toLowerCase();
  // Tarjeta Nu: su tabla de movimientos usa un encabezado propio y filas con
  // detalles anidados tipo "avance a cuenta | ↪ Comisión por servicio | $X".
  if (
    /fecha\s*\|\s*descripci[oó]n\s*\|\s*valor\s*\|\s*cuotas?/i.test(text) ||
    (/\bnu\b|avance a cuenta/i.test(text) &&
      /cuota|inter[eé]s\s+del\s+mes|total\s+a\s+pagar/i.test(text))
  ) {
    return "nu";
  }
  // App de BBVA: fechas "09 ago -17:49• Bre-B" con hora separada por guion.
  if (/\b\d{1,2}\s+[a-z]{3}\s*-\s*\d{1,2}:\d{2}\b/i.test(text))
    return "bbva_app";
  // Extracto Nequi (PDF oficial): el emisor (Bancolombia) aparece en su pie de
  // página, así que esta huella va ANTES que la de bancolombia.
  const n = t
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n");
  if (
    /\bnequi\b/i.test(text) &&
    /(?:numero\s+de\s+deposito\s+de\s+bajo\s+monto|deposito\s+de\s+bajo\s+monto|fecha\s+del\s+movimiento)/i.test(
      n,
    )
  ) {
    return "nequi_pdf";
  }
  if (/\bbancolombia\b/i.test(t)) return "bancolombia";
  // App Nequi: navegación "Inicio | Movimientos | Servicios" o "Más Movimientos".
  if (
    /\binicio\s*\|\s*movimientos?\s*\|\s*servicios\b/i.test(text) ||
    /\bmas\s+movimientos\b/i.test(text)
  ) {
    return "nequi";
  }
  if (/\bcuenta\s+de\s+ahorros\b|\bbbva\b/i.test(t)) return "bbva";
  return null;
};

// Líneas informativas/resumen de la tarjeta Nu que NO son movimientos. Se
// anclan al inicio de la línea para no tocar descripciones de movimientos
// reales (p.ej. "AVANCE A CUENTA").
const NU_SUMMARY_RE =
  /^\s*(?:nit|periodo|fecha\s+de\s+corte|fecha\s+de\s+vencimiento|cuota\s+de\s+manejo|pago\s+minimo|pago\s+m[íi]nimo|total\s+a\s+pagar|restante|deuda\s+total|inter[eé]s\s+del\s+mes|porcentaje\s+y\s+valor|por\s+pagar|del\s+mes|este\s+mes|porcentaje|saldo|disponible|titular|cliente)\b/i;

// Líneas que marcan el INICIO del bloque de resumen al final del extracto Nu
// ("PAGO MÍNIMO", "TOTAL A PAGAR", "RESTANTE"…). A partir de ahí se corta:
// las filas de resumen y sus valores no son movimientos.
const NU_BLOCK_START =
  /^\s*(?:pago\s+(?:minimo|m[íi]nimo)|total\s+a\s+pagar|restante|deuda\s+total|inter[eé]s\s+del\s+mes)\b/i;

// Fecha Nu al inicio de una fila: "27 JUL 2026 | …", "24 JUL | …".
const nuDateFrag = (
  line: string,
): { d: number; m: number; y: number | null } | null => {
  const m = line.match(/^(\d{1,2})\s+([a-zA-Z]{3})(?:\s+(\d{4}))?(?:\s*\||$)/i);
  if (!m) return null;
  const month = MONTHS_SHORT[normalizeWord(m[2])];
  if (month === undefined) return null;
  const d = Number(m[1]);
  if (d < 1 || d > 31) return null;
  return { d, m: month, y: m[3] ? Number(m[3]) : null };
};

// Año al inicio que completa una fecha partida por el OCR: "2026 | Zipaquira la".
const nuYearAtStart = (line: string): { year: number; rest: string } | null => {
  const m = line.match(/^(?:19|20)\d{2}(?:\s*\|\s*)?/);
  if (!m) return null;
  return {
    year: Number(m[0].slice(0, 4)),
    rest: line.slice(m[0].length),
  };
};

// Descripción de una fila Nu: descarta ruido de las columnas de cuotas
// ("1 de 36") y porcentaje ("2.07%").
const buildNuDescription = (cells: Cell[]): string => {
  const parts = cells
    .filter((c) => !c.isDate && !c.isMoney)
    .filter((c) => c.text.length > 0)
    .map((c) => c.text);
  const meaningful = parts.filter((p) => {
    if (/^\d{1,2}\s+de\s+\d{1,2}$/.test(p)) return false;
    if (/^[\d.,]+\s*%$/.test(p)) return false;
    if (p.includes("%")) return false;
    if (isIntegerCell(p)) return false;
    if (isTimeFragment(p)) return false;
    return true;
  });
  return cleanDescription(meaningful.join(" "));
};

// En la tarjeta Nu, "Pago …" es un abono a la tarjeta (ingreso); el resto son
// compras, avances y comisiones (egresos).
const detectNuType = (description: string): ParsedTransactionType =>
  /^pago\b/i.test(description.trim()) ? "income" : "expense";

// Modelo Nu (tarjeta): la tabla de movimientos tiene filas de 9 columnas con
// fechas "27 JUL 2026" (a veces partidas), descripciones de varias líneas,
// comisiones anidadas ("avance a cuenta | ↪ Comisión por servicio | $X") y un
// bloque de resumen final que se corta.
const parseNu = (
  lines: string[],
  opts?: { year?: number; period?: StatementPeriod | null },
): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];

  let current: ParsedTransaction | null = null;
  let currentDate: { d: number; m: number; y: number | null } | null = null;
  let stop = false;

  const toTimestampSafe = (
    date: { d: number; m: number; y: number | null } | null,
  ) => {
    if (!date) return null;
    const year = date.y ?? resolveYearForDate(date.d, date.m + 1, opts);
    return toTimestamp(year, date.m + 1, date.d);
  };

  const emit = (
    date: { d: number; m: number; y: number | null } | null,
    amount: number | null,
    type: ParsedTransactionType,
    description: string,
  ) => {
    // FIX 2: Forzamos el signo para las transacciones de Nu
    const finalAmount =
      amount !== null
        ? type === "expense"
          ? -Math.abs(amount)
          : Math.abs(amount)
        : null;
    const cand: ParsedTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: toTimestampSafe(date),
      amount: finalAmount,
      type,
      description:
        description || (type === "income" ? "Ingreso" : "Movimiento"),
      confidence: date && amount !== null && description ? "high" : "medium",
      page: 1,
    };
    candidates.push(cand);
    current = cand;
    currentDate = date;
  };

  const applyYear = (y: number) => {
    if (currentDate && currentDate.y === null) {
      currentDate.y = y;
      const ts = toTimestamp(y, currentDate.m + 1, currentDate.d);
      if (ts !== null && current) {
        current.date = ts;
        if (current.confidence !== "high") current.confidence = "high";
      }
    }
  };

  const appendDesc = (text: string) => {
    if (!current) return;
    const clean = cleanDescription(text);
    if (!clean) return;
    current.description = current.description
      ? cleanDescription(`${current.description} ${clean}`)
      : clean;
  };

  const processLine = (rawLine: string) => {
    if (stop) return;
    const line = rawLine.trim();
    if (!line || isSeparatorLine(line)) return;

    if (NU_BLOCK_START.test(line)) {
      stop = true;
      return;
    }
    if (NU_SUMMARY_RE.test(line)) return;

    // Renglones de encabezado de columnas: con "|", sin dígitos y con palabras
    // de columna ("del mes | Porcentaje y valor | este mes | por pagar").
    if (
      line.includes("|") &&
      !/\d/.test(line) &&
      COLUMN_HEADER_WORDS.test(normalizeWord(line))
    ) {
      return;
    }

    // Año suelto que completa la fecha partida: "2026", "2026 | Zipaquira la",
    // "2026 | ↪ A intereses $0,00". El resto se reprocesa.
    const yearFrag = nuYearAtStart(line);
    if (yearFrag) {
      applyYear(yearFrag.year);
      if (yearFrag.rest.trim()) processLine(yearFrag.rest);
      return;
    }

    // Desglose de un pago ("↪ A capital $10.160,60"): detalle, no movimiento.
    if (/^[↪→]/.test(line)) return;

    const date = nuDateFrag(line);
    const cells = classifyCells(line);
    const moneyCells = cells.filter((c) => c.isMoney);
    const amount = moneyCells.length ? parseMoney(moneyCells[0].text) : null;

    if (amount !== null) {
      const arrowIdx = cells.findIndex(
        (c) => c.text.includes("↪") || c.text.includes("→"),
      );
      if (arrowIdx !== -1) {
        // "avance a cuenta | ↪ Comisión por servicio | $5.000,00": lo anterior
        // completa la descripción del movimiento previo; lo posterior es un
        // movimiento propio (la comisión), con la fecha del bloque.
        const before = cleanDescription(
          cells
            .slice(0, arrowIdx)
            .map((c) => c.text)
            .join(" "),
        );
        if (before) appendDesc(before);
        const after = buildNuDescription(
          cells
            .slice(arrowIdx)
            .map((c) => ({ ...c, text: c.text.replace(/[↪→]/g, " ") })),
        );
        emit(currentDate, amount, detectNuType(after), after);
      } else if (date) {
        const desc = buildNuDescription(cells);
        emit(date, amount, detectNuType(desc), desc);
      } else {
        const desc = buildNuDescription(cells);
        emit(currentDate, amount, detectNuType(desc), desc);
      }
      return;
    }

    if (date) {
      // Fecha sin monto: abre un bloque cuyo monto llega después.
      currentDate = date;
      return;
    }

    // Descripción suelta: se anexa al movimiento en curso.
    const clean = cleanDescription(cells.map((c) => c.text).join(" "));
    if (clean) appendDesc(clean);
  };

  const headerIdx = lines.findIndex((l) =>
    /fecha\s*\|\s*descripci[oó]n/i.test(l),
  );
  if (headerIdx === -1) {
    // Sin huella de la tabla Nu: no podemos modelarla.
    return { candidates, unparsedLines };
  }

  for (let i = headerIdx + 1; i < lines.length && !stop; i += 1) {
    processLine(lines[i]);
  }

  return { candidates, unparsedLines };
};

// ---------------------------------------------------------------------------
// Modelos de APPS (capturas): Nequi y BBVA app. El OCR devuelve los bloques
// por coordenadas, así que aquí se reconstruyen las transacciones por bloques
// de descripción + monto, sin depender de columnas fijas.
// ---------------------------------------------------------------------------

// Extrae un monto con signo de una línea ("-$ 20.000,00", "$30.000,00",
// "-$ 40,0O"). El OCR confunde "$" con "Š" y la "O" con "0". Devuelve el monto
// y el resto de la línea (descripción). Un entero pelado ("2026", el "2" de
// "G2A.COM") NO es monto: se escanea hasta encontrar el token real.
const extractSignedAmount = (
  line: string,
): { amount: number; rest: string } | null => {
  const cleaned = line.replace(/[Š]/g, "$").replace(/([\d.,])O/g, "$10");
  const re = /-?\s*\$?\s*\d[\d.,\s]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const tok = m[0];
    // Requiere signo/separador para no tratar "2026" como monto.
    if (!/[.,$]/.test(tok) && !/^-/.test(tok)) continue;
    const amount = parseMoney(tok);
    if (amount === null) continue;
    const rest = (
      cleaned.slice(0, m.index) +
      " " +
      cleaned.slice(m.index + tok.length)
    ).trim();
    return { amount, rest };
  }
  return null;
};

// Modelo Nequi (captura de la app): movimientos en bloques agrupados por día.
// El signo del monto define ingreso/egreso; el detalle duplicado (mismo valor,
// signo opuesto) se ignora.
const NEQUI_UI_NOISE =
  /^(?:movimientos?|busca|q\s+busca|mas\s+movimientos?|inicio\s*\|\s*movimientos?\s*\|\s*servicios|hoy\s*\|\s*mas\s+movimientos?|mas\s+movimientos|[$Š]\s*)$/i;

const NEQUI_DAY_LABEL =
  /^(?:hoy|ayer|lunes|martes|mi[ée]rcoles|jueves|viernes|s[aá]bado|domingo)$/i;

const parseNequi = (lines: string[]): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];

  let pendingDesc: string[] = [];
  let lastEmitted: ParsedTransaction | null = null;

  const appendToLast = (text: string) => {
    const clean = cleanDescription(text);
    if (!clean || !lastEmitted) return;
    lastEmitted.description = lastEmitted.description
      ? cleanDescription(`${lastEmitted.description} ${clean}`)
      : clean;
  };

  for (const line of lines) {
    if (NEQUI_UI_NOISE.test(line)) {
      // FIX 3: Quitamos el "break". Simplemente limpiamos e ignoramos la línea.
      pendingDesc = [];
      lastEmitted = null;
      continue;
    }
    if (NEQUI_DAY_LABEL.test(line)) {
      pendingDesc = [];
      lastEmitted = null;
      continue;
    }
    if (isYearOnly(line)) continue;

    const money = extractSignedAmount(line);
    if (money !== null) {
      // Detalle duplicado: mismo valor con signo opuesto ("-$20.000" y luego
      // "$20.000"): es el desglose del mismo movimiento, se anexa la descripción
      // y se descarta.
      if (
        lastEmitted &&
        lastEmitted.amount !== null &&
        money.amount === -lastEmitted.amount
      ) {
        const clean = cleanDescription(money.rest);
        if (clean) appendToLast(clean);
        appendToLast(pendingDesc.join(" "));
        pendingDesc = [];
        continue;
      }

      const type: ParsedTransactionType =
        money.amount < 0 ? "expense" : "income";
      const description = cleanDescription(
        [...pendingDesc, money.rest].join(" "),
      );

      // FIX 4: Asegurar que el monto guardado respete el signo
      const finalAmount =
        type === "expense" ? -Math.abs(money.amount) : Math.abs(money.amount);
      const cand: ParsedTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: null,
        amount: finalAmount,
        type,
        // Eliminamos el fallback por defecto aquí:
        description: description,
        confidence: "medium",
        page: 1,
      };
      candidates.push(cand);
      lastEmitted = cand;
      pendingDesc = [];
      continue;
    }

    if (line.length <= 80) {
      if (lastEmitted) {
        appendToLast(line);
      } else {
        pendingDesc.push(line);
      }
    }
  }
  for (const cand of candidates) {
    if (!cand.description || cand.description.trim() === "") {
      cand.description = cand.type === "income" ? "Ingreso" : "Movimiento";
    }
  }
  return { candidates, unparsedLines };
};

// Modelo Bancolombia (cuenta de ahorros, PDF oficial). Tabla con columnas
// separadas por " | ":
//   "FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO"
//   "1/04 | TRANSF A OTROS BANCOS | -250,000.00 | 569,525.53"
// Reglas:
//   - La fecha es dd/mm sin año (se completa con el año del extracto).
//   - El ÚLTIMO monto de la fila es el SALDO; el VALOR es el que está
//     inmediatamente ANTES (puede haber columnas numéricas tipo DCTO antes).
//     Si solo hay un monto (suele pasar en "ABONO INTERESES AHORROS" donde el
//     OCR pierde el valor), es el saldo: se descarta la fila para no inventar
//     un movimiento gigante.
//   - El signo define el tipo: negativo = cargo (gasto), positivo = abono
//     (ingreso). Las filas de RESUMEN y el pie de página se ignoran.
const parseBancolombia = (
  lines: string[],
  opts?: { year?: number; period?: StatementPeriod | null },
): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];

  const headerIdx = lines.findIndex((l) =>
    /fecha\s*\|\s*descripci[oó]n/i.test(l),
  );
  if (headerIdx === -1) return { candidates, unparsedLines };

  // Valor que el OCR dejó en una línea suelta antes de su fila:
  //   "-26,000.00"
  //   "14/04 | TRANSFERENCIA A NEQUI | 170,883.94"
  let pendingValue: number | null = null;

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const hasSeparator = line.includes("|");
    const cells = classifyCells(line);
    const dateCell = cells.find((c) => c.isDate);

    // Fecha de la fila: desde la celda de fecha, o incrustada en la línea si el
    // OCR no la dejó como celda ("1.04.2024 COMPRA ...", "2024-01-10 ...").
    const date = dateCell
      ? extractDate(dateCell.text, {
          year: opts?.year,
          period: opts?.period,
        })
      : extractDate(line, {
          year: opts?.year,
          period: opts?.period,
        });

    if (!date) {
      // Línea sin fecha: si es SOLO un monto, es el valor que el OCR dejó en
      // línea suelta antes de su fila. Cualquier otra cosa es ruido.
      if (!hasSeparator) {
        const solo = parseMoney(line);
        if (solo !== null && solo !== 0) pendingValue = solo;
      }
      continue;
    }

    const description = buildDescription(cells);
    const moneyCells = cells.filter((c) => c.isMoney);

    let amount: number | null = null;
    if (moneyCells.length >= 2) {
      // El saldo es el ÚLTIMO monto; el VALOR es el anterior.
      const v = parseMoney(moneyCells[moneyCells.length - 2].text);
      amount = v === null || v === 0 ? null : v;
    } else if (moneyCells.length === 1) {
      // Un solo monto. En "ABONO INTERESES" el valor es minúsculo (<10), así
      // que un monto grande es el SALDO (el valor no se leyó) y se salta. En
      // cualquier otra fila, el monto único es el VALOR de una fila truncada
      // (sin saldo) o un valor que el OCR dejó en la línea anterior.
      const single = parseMoney(moneyCells[0].text);
      const isAbonoInteres = /^abono\s+intere/i.test(description);
      if (pendingValue !== null) {
        amount = pendingValue;
      } else if (isAbonoInteres && single !== null && Math.abs(single) >= 10000) {
        amount = null;
      } else {
        amount = single;
      }
    }
    pendingValue = null;

    // Sin valor legible: se salta (no se inventa ni se crea un falso
    // positivo). La fila queda en el texto crudo para agregarla a mano.
    if (amount === null) continue;

    const type: ParsedTransactionType = amount < 0 ? "expense" : "income";
    candidates.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: date?.value ?? null,
      amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
      type,
      description: description || "Movimiento",
      confidence: date ? "high" : "medium",
      page: 1,
    });
  }

  return { candidates, unparsedLines };
};

// Modelo Nequi PDF (extracto oficial). El OCR puede devolver la transacción en
// DOS formas, y se soportan ambas:
//   a) Forma de bloque (OCR sin coordenadas): cada transacción ocupa 4 líneas
//      separadas: fecha, descripción, valor (con "$"), saldo.
//   b) Forma columnar (ML Kit con coordenadas): una fila por transacción con
//      columnas separadas por " | ":
//      "29/01/2026 | RETIRO EN CAJERO | $-10,000.00 | $2,942.87"
// El bloque de resumen ("Saldo anterior", "Total abonos"…) y los encabezados
// de columna se ignoran. El saldo (último monto de la fila) no es un
// movimiento.
const parseNequiPdf = (
  lines: string[],
  opts?: { year?: number; period?: StatementPeriod | null },
): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];

  let inTable = false;
  let awaitingHeader = false;
  let currentDate: number | null = null;
  let desc = "";
  let pendingSaldo = false;

  // Un monto real de este formato SIEMPRE lleva "$" ("$-10,000.00",
  // "$5,000.00"). Así no se confunde con teléfonos ni números de depósito.
  const extractStrictMoney = (line: string): number | null => {
    const tokens = line.split(/\s+/);
    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      if (tok === "$") {
        const next = tokens[i + 1];
        if (next && /^[+-]?\d[\d.,]*$/.test(next)) {
          const amount = parseMoney(tok + next);
          if (amount !== null) return amount;
        }
        continue;
      }
      if (tok.includes("$")) {
        const amount = parseMoney(tok);
        if (amount !== null) return amount;
      }
    }
    return null;
  };

  const pushCandidate = (
    date: number | null,
    amount: number,
    description: string,
  ) => {
    const type: ParsedTransactionType =
      amount < 0 ? "expense" : "income";
    candidates.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
      type,
      description: cleanDescription(description) || "Movimiento",
      confidence: date !== null ? "high" : "medium",
      page: 1,
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || isSeparatorLine(line)) continue;
    if (/^p[aá]gina(?:\s+\d+)?$/i.test(line)) continue;

    if (/^movimientos?$/i.test(line)) {
      inTable = true;
      awaitingHeader = true;
      currentDate = null;
      desc = "";
      pendingSaldo = false;
      continue;
    }
    // Si el OCR no trae la sección "Movimientos" explícita, el encabezado de
    // columnas ("Fecha del movimiento | …") también abre la tabla.
    if (!inTable && /^fecha\s+del\s+movimiento/i.test(line)) {
      inTable = true;
      awaitingHeader = true;
      currentDate = null;
      desc = "";
      pendingSaldo = false;
    }
    if (!inTable) continue;

    // Tras "Movimientos" vienen los encabezados de columna (sin fechas ni
    // montos): "Fecha del movimiento", "Descripción", "Valor", "Saldo".
    if (awaitingHeader) {
      if (extractDate(line, opts) === null && extractStrictMoney(line) === null) {
        continue;
      }
      awaitingHeader = false;
    }

    // --- Forma columnar: una fila con " | " por transacción ---
    if (line.includes("|")) {
      const cells = classifyCells(line);
      const dateCell = cells.find((c) => c.isDate);
      const d = dateCell ? extractDate(dateCell.text, opts) : null;
      // El primer monto es el VALOR del movimiento; el último es el SALDO.
      const moneyCells = cells.filter((c) => c.isMoney);
      if (moneyCells.length > 0) {
        const amount = parseMoney(moneyCells[0].text);
        if (amount !== null && amount !== 0) {
          const description = buildDescription(cells);
          pushCandidate(d?.value ?? null, amount, description);
        }
      }
      currentDate = null;
      desc = "";
      pendingSaldo = false;
      continue;
    }

    // --- Forma de bloque: fecha / descripción / valor / saldo ---
    if (isDateOnlyLine(line)) {
      const dd = extractDate(line, opts);
      if (dd) currentDate = dd.value;
      desc = "";
      pendingSaldo = false;
      continue;
    }

    const money = extractStrictMoney(line);
    if (money !== null) {
      if (pendingSaldo) {
        // El saldo posterior al valor del movimiento se ignora.
        pendingSaldo = false;
        currentDate = null;
        desc = "";
        continue;
      }
      pushCandidate(currentDate, money, desc);
      pendingSaldo = true;
      desc = "";
      continue;
    }

    // Línea de descripción (puede ocupar varias líneas).
    desc = desc ? `${desc} ${line}` : line;
  }

  return { candidates, unparsedLines };
};

// Modelo BBVA app (captura): cada movimiento empieza con "09 ago -17:49• Bre-B"
// (fecha con mes abreviado y hora), luego la descripción y el monto, y a veces
// un nombre de persona en la línea siguiente.
const BBVA_APP_DATE = /^(\d{1,2})\s+([a-zA-Z]{3})\s*-\s*(\d{1,2}:\d{2})/i;

const parseBbvaApp = (
  lines: string[],
  opts?: { year?: number; period?: StatementPeriod | null },
): StatementParseResult => {
  const candidates: ParsedTransaction[] = [];
  const unparsedLines: string[] = [];

  let pendingDate: number | null = null;
  let pendingDesc: string[] = [];
  let lastEmitted: ParsedTransaction | null = null;

  const appendToLast = (text: string) => {
    const clean = cleanDescription(text);
    if (!clean || !lastEmitted) return;
    lastEmitted.description = lastEmitted.description
      ? cleanDescription(`${lastEmitted.description} ${clean}`)
      : clean;
  };

  for (const line of lines) {
    if (/^(?:buscar\s+movimiento|q\s*\|\s*buscar|busca)/i.test(line)) continue;
    // Etiqueta de tipo de la app BBVA ("D:") que no aporta a la descripción.
    if (/^[A-Za-zÁÉÍÓÚÑáéíóúñ]:$/.test(line)) continue;
    if (isYearOnly(line)) continue;

    const dateMatch = BBVA_APP_DATE.exec(line);
    if (dateMatch) {
      const month = MONTHS_SHORT[normalizeWord(dateMatch[2])];
      if (month !== undefined) {
        const year = resolveYearForDate(
          Number(dateMatch[1]),
          month + 1,
          opts,
        );
        const ts = toTimestamp(year, month + 1, Number(dateMatch[1]));
        pendingDate = ts ?? null;
      }
      pendingDesc = [];
      lastEmitted = null;
      continue;
    }

    const money = extractSignedAmount(line);
    if (money !== null) {
      const type: ParsedTransactionType =
        money.amount < 0 ? "expense" : "income";
      const description = cleanDescription(
        [...pendingDesc, money.rest].join(" "),
      );
      const cand: ParsedTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: pendingDate,
        amount: money.amount,
        type,
        description:
          description || (type === "income" ? "Ingreso" : "Movimiento"),
        confidence: pendingDate !== null ? "high" : "medium",
        page: 1,
      };
      candidates.push(cand);
      lastEmitted = cand;
      pendingDesc = [];
      continue;
    }

    // Líneas sueltas: si ya hay un movimiento emitido, se anexan a él
    // ("CAICEDO", "VILLAMIL"); si hay fecha pendiente, son la descripción;
    // si no, son ruido del encabezado.
    if (lastEmitted) {
      appendToLast(line);
    } else if (pendingDate !== null) {
      pendingDesc.push(line);
    }
  }

  return { candidates, unparsedLines };
};

export const parseStatement = (
  text: string,
  opts?: { period?: StatementPeriod | null; year?: number },
): StatementParseResult => {
  const rawLines = text
    .replace(/\u00A0/g, " ")
    .split(/\r?\n/)
    .map((l) =>
      // El OCR de tablas a veces separa columnas con TAB en vez de "|".
      l
        .split("\t")
        .join(" | ")
        .replace(/\s+/g, " ")
        .trim(),
    );

  const format = detectFormat(text);
  // Año y periodo por defecto: si no se pasan, se detectan sobre TODO el
  // documento. Para fechas sin año, el periodo (rango) tiene prioridad sobre
  // el año suelto.
  const period = opts?.period !== undefined ? opts?.period : detectStatementPeriod(text);
  const year = opts?.year ?? detectStatementYear(text);
  const parseOpts = { year, period };
  if (format === "nu") {
    const result = parseNu(rawLines, parseOpts);
    if (result.candidates.length > 0) return result;
  } else if (format === "nequi") {
    const result = parseNequi(rawLines);
    if (result.candidates.length > 0) return result;
  } else if (format === "nequi_pdf") {
    const result = parseNequiPdf(rawLines, parseOpts);
    if (result.candidates.length > 0) return result;
  } else if (format === "bancolombia") {
    const result = parseBancolombia(rawLines, parseOpts);
    if (result.candidates.length > 0) return result;
  } else if (format === "bbva_app") {
    const result = parseBbvaApp(rawLines, parseOpts);
    if (result.candidates.length > 0) return result;
  }
  // Si el modelo de formato no reconoció movimientos, se cae al genérico.

  return parseLines(rawLines, { year, period: parseOpts.period });
};

// Detecta el año del período del extracto (el que más aparece en fechas
// "aaaa/mm/dd"). Se usa para completar fechas dd/mm sin año del OCR
// ("1/04" → 1 de abril del año del extracto, no el actual).
export const detectStatementYear = (text: string): number | undefined => {
  const matches = text.match(/\b(?:19|20)\d{2}\b/g);
  if (!matches || matches.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const y of matches) counts.set(y, (counts.get(y) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = 0;
  for (const [y, c] of counts) {
    if (c > bestCount) {
      best = Number(y);
      bestCount = c;
    }
  }
  return best ?? undefined;
};
