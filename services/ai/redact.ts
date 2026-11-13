// services/ai/redact.ts
//
// PRIVACIDAD: ninguna imagen ni texto de extracto bancario se envía a la IA.
// Este módulo redacta (localmente y antes de cualquier uso) los datos
// sensibles que puedan aparecer en un extracto: números de tarjeta, cuentas,
// CCI, cédulas, NIT, teléfonos, correos y nombres de terceros.
//
// La política es "privacidad primero": se prefiere redactar de más antes que
// filtrar un dato sensible. Lo redactado se reemplaza por ████.

import { isBankName } from "./statementParser";

const PLACEHOLDER = "████";

// Patrones globales que se aplican a todo el texto.
const GLOBAL_PATTERNS: RegExp[] = [
  // Correos electrónicos.
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  // Números de tarjeta: 13-19 dígitos. Se exige agrupación por 4 dígitos
  // (1234 5678 9012 3456) o dígitos corridos sin espacios, para NO borrar
  // montos del OCR como "626572 2723046" (que son 6+7 dígitos separados).
  /(?:\b\d{4}(?:[ -]?\d{4}){2,4}\b)|\b\d{15,19}\b/g,
  // Celulares colombianos: (+57) 300 123 4567. Solo con prefijo +57/0057 o
  // tras una etiqueta (CEL/TEL) para no borrar montos como "302634 2420412".
  /(?:\+57\s?|0057\s?)\d{10}(?:\s?\d{2})?|\b(?:CEL|CELULAR|TEL|TELÉFONO|TELEFONO|MÓVIL|MOVIL)\s*[:.]?\s*3\d{2}\s?\d{3}\s?\d{4}\b/gi,
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

// Un nombre personal: al menos una palabra con mayúscula inicial (o el rótulo
// genérico "cuenta" / "otra persona" que a veces deja el OCR). Se acepta desde
// nombres cortos ("Mi", "Daviplata", "Nu") para no dejar destinatarios a la
// vista.
const PERSON_NAME =
  /(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}|cuenta\s+registrada|otra\s+persona)/;

// Nombres de terceros dentro de una descripción de transferencia:
// "Transferencia recibida de María Pérez", "Enviado a Juan López",
// "RECIBI POR BRE-B DE: EDWARD", "POR BRE-B DE: Ana".
// OJO: dentro de un template literal el backslash debe escribirse DOBLE
// (\\s), si no JS lo interpreta como el literal "s" y el regex no matchea.
const TRANSFER_NAME = new RegExp(
  `(?:(?:recibida|recibido|por)\\s+de|(?:enviada|enviado)\\s+a|transferencia\\s+(?:recibida\\s+de|enviada\\s+a|de|a)|consignación\\s+(?:recibida\\s+de|a)|RECIBI\\s+POR\\s+BRE-B\\s+DE:|POR\\s+BRE-B\\s+DE:)\\s*(${PERSON_NAME.source})`,
  "gi",
);

// Transferencias SALIENTES hacia una cuenta o persona:
// "Transferio a: Juan Pérez", "Transferencia a: Mi Cuenta Ahorros",
// "Transferí a: otra persona", "Transferido a: Cuenta registrada".
// El nombre destinatario se redacta igual que cualquier tercero; la etiqueta
// ("Transferencia a") se conserva para que la verificación la reconozca como
// transferencia y el usuario elija la cuenta destino (suya o de otra persona).
export const TRANSFER_TO_PATTERNS: RegExp[] = [
  /\bTransfer(?:io|í|o)\s*(?:a|para)\s*:?\s*((?:cuenta\s+registrada|otra\s+persona|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}))/gi,
  /\bTransferencia\s*a\s*:?\s*((?:cuenta\s+registrada|otra\s+persona|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}))/gi,
  /\bTransfir(?:ió|io)\s*(?:a|para)\s*:?\s*((?:cuenta\s+registrada|otra\s+persona|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}))/gi,
  /\bTransferido\s*(?:a|para)\s*:?\s*((?:cuenta\s+registrada|otra\s+persona|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}))/gi,
];

// Redacta el destinatario de una transferencia salvo que sea el nombre de una
// institución bancaria (Bancolombia, Nequi, BBVA…): los bancos no son datos
// personales y se conservan para poder vincular la transferencia a la cuenta
// del usuario en la verificación.
const redactNameInMatch = (match: string, name: string | undefined) => {
  if (!name) return match;
  if (isBankName(name)) return match;
  return match.replace(name, PLACEHOLDER);
};

const redactTransferTo = (text: string): string => {
  let out = text;
  for (const re of TRANSFER_TO_PATTERNS) {
    out = out.replace(re, redactNameInMatch);
  }
  return out;
};

// Nombres propios en frases típicas de apps (Nequi, Bancolombia app…):
// "Juan Pérez te pagó", "Ana te envió", "Enviaste a Carlos",
// "Recibiste de María", "Pago de Luis". Se reemplaza TODO el dato personal
// por una etiqueta genérica ("Transferencia recibida", "Transferencia
// enviada") para que la descripción quede limpia.
const APP_TRANSFER_PHRASES: {
  re: RegExp;
  replace: string | ((match: string) => string);
}[] = [
  {
    re: /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})[ \t]+te[ \t]+(?:pago|pagó|paga|envió|envio|envía|transfirió|transfirió)\b/gi,
    replace: "Pago recibido",
  },
  {
    re: /\b(?:enviaste|envió|envio)[ \t]+(?:a|para)[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}\b/gi,
    replace: "Transferencia enviada",
  },
  {
    // OCR une "Enviaste a" en "Enviastea": se redacta igual.
    re: /\b(?:enviastea|enviaste\s+a|envi[oó]\s+a)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}\b/gi,
    replace: "Transferencia enviada",
  },
  {
    re: /\b(?:recibiste|recibí|recibi)[ \t]+de[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}\b/gi,
    replace: "Transferencia recibida",
  },
  {
    // "Pago de Luis", "Transferencia a: Bancolombia". Si el destinatario es
    // una institución bancaria (no un dato personal) se conserva la frase
    // completa para poder vincularla con la cuenta del usuario.
    re: /\b(?:pago|consignación|consignacion|transferencia)[ \t]+(?:de|a|para)[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:[ \t]+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}\b/gi,
    replace: (match: string) => {
      const name = match.replace(
        /(?:pago|consignación|consignacion|transferencia)[ \t]+(?:de|a|para)[ \t]+/i,
        "",
      );
      return isBankName(name) ? match : "Transferencia";
    },
  },
];

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
  out = out.replace(TRANSFER_NAME, redactNameInMatch);

  // 3a) Transferencias salientes ("Transferio a: Juan", "Transferencia a: …"):
  // la etiqueta se conserva (para detectarla en la verificación), el
  // destinatario se redacta.
  out = redactTransferTo(out);

  // 3b) Frases típicas de apps con nombre propio -> etiqueta genérica.
  for (const phrase of APP_TRANSFER_PHRASES) {
    const replace = phrase.replace;
    out =
      typeof replace === "string"
        ? out.replace(phrase.re, replace)
        : out.replace(phrase.re, replace);
  }

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
