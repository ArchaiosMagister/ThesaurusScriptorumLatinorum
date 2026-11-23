export class InvalidCorpusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCorpusError';
  }
}

export class UnsupportedSchemaVersionError extends Error {
  constructor(version: unknown) {
    super(`Versión del esquema no admitida: ${String(version)}.`);
    this.name = 'UnsupportedSchemaVersionError';
  }
}
