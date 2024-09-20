export function createErrorFactory(errorName: string) {
  return class CustomError extends Error {
    constructor(message: string) {
      super(message);
      this.name = errorName; // Set the error name provided to the factory
      Error.captureStackTrace(this, CustomError); // Capture the stack trace and omit the constructor frame
    }
  };
}
