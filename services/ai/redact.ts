// services/ai/redact.ts
//
// PRIVACIDAD: ninguna imagen ni texto de extracto bancario se envía a la IA.
// Este módulo redacta (localmente y antes de cualquier uso) los datos
// sensibles que puedan aparecer en un extracto: números de tarjeta, cuentas,
// CCI, cédulas, NIT, teléfonos, correos y nombres de terceros.
//
// La política es "privacidad primero": se prefiere redactar de más antes que
// filtrar un dato sensible. Lo redactado se reemplaza por ████.

const PLACEHOLDER = "████";

// Patrones globales que se aplican a todo el texto.
const GLOBAL_PATTERNS: RegExp[] = [
  // Correos electrónicos.
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  // Números de tarjeta: 13-19 dígitos con o sin espacios/guiones.
  /\b(?:\d[ -]?){13,19}\b/g,
  // Celulares colombianos: (+57) 300 123 4567.
  /(?:\+57\s?|0057\s?)?[3]\d{2}\s?\d{3}\s?\d{4}/g,
  // Cuentas, CCI (23 dígitos) y documentos largos: 8-24 dígitos seguidos.
  // Se redacta también a montos "largos" sin separador: preferimos
  // sobre-redactar a arriesgar un número de cuenta en el texto.
  /\b\d{8,24}\b/g,
  // Tarjetas enmascaradas: "4097 **** 1234", "**** 1234", "●●●● 1234".
  /(?:\*+|●+|•+)[ \t]*-?[ \t]*\d{1,6}\b/g,
];

// Números que aparecen tras una etiqueta: "NIT 900.123.456", "C.C. 7.123.456",
// "CTA 12345678", "TARJETA 4097 **** 1234", "CCI 123...".
// Nota: se usa [ \t] (no \s) para no cruzar saltos de línea.
const LABELED_NUMBER =
  /(NIT|C\.?\s*C\.?|CÉDULA|DOCUMENTO|IDENTIFICACIÓN|\bID\b|CTA\.?|CUENTA|TARJETA|CCI)\s*[:.]?[ \t]*[\d][\d \t.-]*/gi;

// Etiquetas seguidas de un nombre personal. Se redacta el resto de la línea.
const PERSON_NAME_LABEL =
  /^\s*(?:CLIENTE|TITULAR|TITULAR\s+DE\s+LA\s+CUENTA|RAZÓN\s*SOCIAL|RAZON\s*SOCIAL|A\s*NOMBRE\s*DE|BENEFICIARIO|BENEFICIARIA)\s*[:.]?\s*(.+)$/i;

// Nombres de terceros dentro de una descripción de transferencia:
// "Transferencia recibida de María Pérez", "Enviado a Juan López".
const TRANSFER_NAME =
  /(?:(?:recibida|recibido)\s+de|(?:enviada|enviado)\s+a|transferencia\s+(?:recibida\s+de|enviada\s+a|de|a)|consignación\s+(?:recibida\s+de|a))\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}){0,3})/gi;

export const redactSensitiveData = (text: string): string => {
  let out = text;

  // 1) Etiquetas con número (NIT, CTA, TARJETA…): redactar solo el número.
  out = out.replace(LABELED_NUMBER, (match) => {
    const numberPart = match.replace(/^[^0-9]*/, "");
    if (!numberPart) return match;
    return match.replace(numberPart, PLACEHOLDER);
  });

  // 2) Patrones globales.
  for (const re of GLOBAL_PATTERNS) {
    out = out.replace(re, PLACEHOLDER);
  }

  // 3) Nombres personales en descripciones de transferencia.
  out = out.replace(TRANSFER_NAME, (match, name) => match.replace(name, PLACEHOLDER));

  // 4) Etiquetas con nombre personal: redactar el resto de la línea.
  // Son líneas dedicadas ("TITULAR: María Pérez"), rara vez filas de tabla.
  out = out
    .split("\n")
    .map((line) => {
      const m = PERSON_NAME_LABEL.exec(line);
      if (!m || !m[1]?.trim()) return line;
      return line.replace(m[1].trim(), PLACEHOLDER);
    })
    .join("\n");

  return out;
};
