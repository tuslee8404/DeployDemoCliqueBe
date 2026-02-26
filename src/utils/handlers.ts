import { Request, Response, NextFunction, RequestHandler } from 'express'

export const wrapRequestHandler = <P>(fnc: RequestHandler<P>) => {
  return async (req: Request<P>, res: Response, next: NextFunction) => {
    try {
      await fnc(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
