export function createErrorFactory(errorName: string) {
  return class CustomError extends Error {
    constructor({ message, stack }: { message: string; stack?: string }) {
      super(message);
      this.name = errorName; // Set the error name provided to the factory
      if (stack) this.stack = stack;
    }
  };
}
