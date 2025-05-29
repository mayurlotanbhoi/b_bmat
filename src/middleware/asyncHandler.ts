import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error('Async Error:', err);
      next(err);
    });
  };
};

export { asyncHandler };
