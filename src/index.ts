import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { HttpContext } from "./types";
import cors from "cors";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import path from "path";
import { Updoot } from "./entities/Updoot";
import { userLoader } from "./utils/createUserLoader";
import { updootLoader } from "./utils/createVoteStatusLoader";

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    database: "dvreddit2",
    username: "postgres",
    password: "1",
    logging: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    cli: { migrationsDir: "migrations" },
    synchronize: true,
    entities: [User, Post, Updoot],
  });
  await connection.runMigrations();

  const app = express();
  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
      },
      saveUninitialized: false,
      secret: "My top secrect",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): HttpContext => ({
      req,
      res,
      redis,
      userLoader: userLoader,
      updootLoader: updootLoader,
    }),
  });

  apolloServer.applyMiddleware({ app, cors: false });
  app.listen(4100, () => console.log("Server started on localhost:4100"));
};

main().catch((err) => console.log("Error", err));
