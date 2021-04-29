import { HttpContext } from "src/types";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<HttpContext> = (
  { context: { req } },
  next
): Promise<any> => {
  if (!req.session.userId) throw new Error("Not Authenticated!");

  return next();
};
