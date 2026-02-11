/**
 * HTTP error class with status code and automatic JSON serialization.
 * Thrown errors of this type are caught by the app and converted to
 * JSON responses with CORS headers.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }

  /** Serialize to a plain object for JSON responses. */
  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      error: this.message,
      status: this.status,
    };
    if (this.details !== undefined) {
      obj.details = this.details;
    }
    return obj;
  }

  // --- Static factories ---

  static badRequest(message = "Bad Request", details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown): HttpError {
    return new HttpError(401, message, details);
  }

  static forbidden(message = "Forbidden", details?: unknown): HttpError {
    return new HttpError(403, message, details);
  }

  static notFound(message = "Not Found", details?: unknown): HttpError {
    return new HttpError(404, message, details);
  }

  static methodNotAllowed(
    message = "Method Not Allowed",
    details?: unknown,
  ): HttpError {
    return new HttpError(405, message, details);
  }

  static conflict(message = "Conflict", details?: unknown): HttpError {
    return new HttpError(409, message, details);
  }

  static tooManyRequests(
    message = "Too Many Requests",
    details?: unknown,
  ): HttpError {
    return new HttpError(429, message, details);
  }

  static internal(
    message = "Internal Server Error",
    details?: unknown,
  ): HttpError {
    return new HttpError(500, message, details);
  }
}
