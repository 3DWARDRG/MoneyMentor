// test/redact.test.ts
//
// Regresión de la redacción de datos sensibles y la detección de
// transferencias SALIENTES ("Transferio a: …", "Transferencia a: …").
// La privacidad es prioridad: el destinatario siempre se redacta; la etiqueta
// se conserva para que la verificación reconozca la transferencia.

import { redactSensitiveData, TRANSFER_TO_PATTERNS } from "../services/ai/redact";
import {
  isOutgoingTransferDescription,
  isBankName,
  extractMentionedBank,
} from "../services/ai/statementParser";

describe("redactSensitiveData: transferencias salientes", () => {
  it('redacta el nombre en "Transferio a: Juan Pérez" y conserva la etiqueta', () => {
    const out = redactSensitiveData("Transferio a: Juan Pérez");
    expect(out).toBe("Transferio a: ████");
  });

  it('redacta el nombre en "Transferencia a: Mi Cuenta Ahorros"', () => {
    const out = redactSensitiveData("Transferencia a: Mi Cuenta Ahorros");
    expect(out).toBe("Transferencia a: ████");
  });

  it('redacta "Transferido a: otra persona"', () => {
    const out = redactSensitiveData("Transferido a: otra persona");
    expect(out).toBe("Transferido a: ████");
  });

  it("tolera OCR que pega palabras ('Transferenciaa:')", () => {
    const out = redactSensitiveData("Transferenciaa: Juan Pérez");
    expect(out).toBe("Transferenciaa: ████");
    expect(isOutgoingTransferDescription("Transferenciaa: ████")).toBe(true);
  });

  it('redacta el nombre en "Transferencia recibida de María Pérez"', () => {
    const out = redactSensitiveData("Transferencia recibida de María Pérez");
    expect(out).toBe("Transferencia recibida de ████");
  });

  it("conserva la etiqueta de transferencia para detectarla luego", () => {
    const out = redactSensitiveData("Transferio a: Ana López");
    expect(out.includes("Transferio a")).toBe(true);
    expect(out.includes("Ana")).toBe(false);
  });

  it('redacta el remitente en "RECIBI POR BRE-B DE: EDWARD"', () => {
    const out = redactSensitiveData("RECIBI POR BRE-B DE: EDWARD");
    expect(out).toBe("RECIBI POR BRE-B DE: ████");
  });

  it('redacta el remitente en "POR BRE-B DE: Ana López"', () => {
    const out = redactSensitiveData("POR BRE-B DE: Ana López");
    expect(out).toBe("POR BRE-B DE: ████");
  });

  it("NO redacta el nombre de un banco (no es dato personal)", () => {
    const out = redactSensitiveData("Transferencia a: Bancolombia");
    expect(out).toBe("Transferencia a: Bancolombia");
    const out2 = redactSensitiveData("Transferio a: Nequi");
    expect(out2).toBe("Transferio a: Nequi");
  });
});

describe("TRANSFER_TO_PATTERNS", () => {
  it("detecta las frases salientes del usuario", () => {
    expect("Transferio a: Juan Pérez").toMatch(TRANSFER_TO_PATTERNS[0]);
    expect("Transferencia a: Cuenta registrada").toMatch(
      TRANSFER_TO_PATTERNS[1],
    );
    expect("Transfirió a: Ana López").toMatch(TRANSFER_TO_PATTERNS[2]);
    expect("Transferido a: otra persona").toMatch(TRANSFER_TO_PATTERNS[3]);
  });
});

describe("isOutgoingTransferDescription", () => {
  it("detecta transferencias salientes", () => {
    expect(isOutgoingTransferDescription("Transferio a: ████")).toBe(true);
    expect(isOutgoingTransferDescription("Transferencia a: ████")).toBe(true);
    expect(isOutgoingTransferDescription("TRANSF A OTROS BANCOS")).toBe(true);
    expect(isOutgoingTransferDescription("Enviado a Carlos")).toBe(true);
  });

  it("no marca ingresos ni gastos comunes como transferencia", () => {
    expect(isOutgoingTransferDescription("Transferencia recibida")).toBe(false);
    expect(isOutgoingTransferDescription("COMPRA EN TIENDA D1")).toBe(false);
    expect(isOutgoingTransferDescription("ABONO INTERESES AHORROS")).toBe(false);
    expect(isOutgoingTransferDescription("")).toBe(false);
  });
});

describe("detección de bancos", () => {
  it("reconoce nombres de bancos y no a personas", () => {
    expect(isBankName("Bancolombia")).toBe(true);
    expect(isBankName("Nequi")).toBe(true);
    expect(isBankName("Nu")).toBe(true);
    expect(isBankName("BRE-B")).toBe(true);
    expect(isBankName("Ana López")).toBe(false);
    expect(isBankName("████")).toBe(false);
  });

  it("extrae el banco mencionado en una descripción", () => {
    expect(extractMentionedBank("Transferencia a: Bancolombia")).toBe(
      "Bancolombia",
    );
    expect(extractMentionedBank("Transferio a: Nequi")).toBe("Nequi");
    expect(extractMentionedBank("COMPRA EN TIENDA D1")).toBeNull();
  });
});
