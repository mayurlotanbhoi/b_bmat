class ApiError extends Error {
  public statusCode: number;
  public success: boolean;
  public errors: Array<{ field?: string; message: string }>;
  
  constructor(
    statusCode: number,
    message: string = "Something is Wrong",
    errors: Array<{ field?: string; message: string }> = [],
    stack: string = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static fromMongooseError(err: any): ApiError {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((error: any) => ({
        field: error.path,
        message: error.message,
      }));
      return new ApiError(400, 'Validation failed', errors);
    }

    return new ApiError(500, 'Internal Server Error');
  }
}

export { ApiError };
