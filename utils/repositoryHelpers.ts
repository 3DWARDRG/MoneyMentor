export function assertValidKeys(
  data: object,
  writableFields: readonly string[],
  repoName: string
): void {
  const invalid = Object.keys(data).find((key) => !writableFields.includes(key));
  if (invalid) {
    throw new Error(`${repoName}: "${invalid}" no es un campo del modelo`);
  }
}

export function assertRequiredFields(
  data: object,
  requiredFields: readonly string[],
  repoName: string
): void {
  const record = data as Record<string, unknown>;
  const missing = requiredFields.find((field) => record[field] == null);
  if (missing) {
    throw new Error(`${repoName}.create: el campo "${missing}" es obligatorio`);
  }
}

export function applyCreate<T extends object>(
  record: T,
  data: object,
  writableFields: readonly string[]
): void {
  const target = record as Record<string, unknown>;
  const source = data as Record<string, unknown>;
  for (const key of writableFields) {
    target[key] = source[key] ?? null;
  }
}

export function applyUpdate<T extends object>(
  record: T,
  data: object,
  writableFields: readonly string[]
): void {
  const target = record as Record<string, unknown>;
  const source = data as Record<string, unknown>;
  for (const key of writableFields) {
    const value = source[key];
    if (value !== undefined) {
      target[key] = value;
    }
  } 
}
