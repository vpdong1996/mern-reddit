import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Session } from "express-session";
export type HttpContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session?: Session & { userId?: number } };
  res: Response;
};
