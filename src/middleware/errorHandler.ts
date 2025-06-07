import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "./ApiResponse.js";
import { ApiError } from "./ApiError.js"; // Make sure this is imported

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  // ✅ Handle Yup validation errors
  if (err.name === "ValidationError" && err.inner) {
    const errorList =
      err.inner.map((e: { path: string; message: string }) => ({
        field: e.path,
        message: e.message,
      })) || [];

    return res
      .status(400)
      .json(new ApiResponse(400, { errors: errorList }, "Validation failed"));
  }

  // ✅ Handle custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      new ApiResponse(err.statusCode, {
        success: err.success,
        errors: err.errors,
      }, err.message)
    );
  }

  // ❌ Fallback for unexpected errors
  return res
    .status(500)
    .json(new ApiResponse(500, {}, "Internal Server Error"));
};
