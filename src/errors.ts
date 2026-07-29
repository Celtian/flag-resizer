export class FlagResizerError extends Error {
  public override readonly name = 'FlagResizerError';

  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
