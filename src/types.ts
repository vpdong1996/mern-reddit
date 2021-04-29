import DataLoader from "dataloader";
import { Request, Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";
import { Updoot } from "./entities/Updoot";
import { User } from "./entities/User";

export type HttpContext = {
  req: Request & { session?: Session & { userId?: number } };
  res: Response;
  redis: Redis;
  userLoader: DataLoader<number, User>;
  updootLoader: DataLoader<{ postId: number; userId: number }, Updoot | null>;
};
