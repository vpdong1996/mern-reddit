import { User } from "../entities/User";
import { HttpContext } from "../types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { UsernamePasswordDto } from "../types/UsernamePasswordDto";
import { validateRegister } from "../utils/validateRegister";
import * as uuid from "uuid";
import { sendEmail } from "../utils/sendEmail";
import { FORGOT_PASSWORD_PREFIX } from "../constants";
import { getConnection } from "typeorm";
@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: HttpContext) {
    return user.id === req.session.userId ? user.email : "";
  }

  @Query(() => User, { nullable: true })
  async getInfo(@Ctx() { req }: HttpContext): Promise<User | undefined> {
    if (!req.session.userId) return undefined;

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { req }: HttpContext
  ): Promise<UserResponse> {
    const { username, password, email } = options;

    const validate = validateRegister(options);
    if (validate) return validate;

    const hashedPassword = await argon2.hash(password);
    // const user = User.create(User, { username, password: hashedPassword, email });
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({ username, password: hashedPassword, email })
        .returning("*")
        .execute();
      user = result.raw[0];
      console.log("Res", result);
    } catch (error) {
      console.log("Error", error);
      if ((error.code = "23505")) {
        return {
          errors: [
            { field: "username", message: "Username is already exists" },
          ],
        };
      }
    }

    // Store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameoremail") usernameoremail: string,
    @Arg("password") password: string,
    @Ctx() { req }: HttpContext
  ): Promise<UserResponse> {
    const user = await User.findOne({
      where: usernameoremail.includes("@")
        ? { email: usernameoremail }
        : { username: usernameoremail },
    });
    if (!user) {
      return {
        errors: [{ field: "usernameoremail", message: "User doesnt exist!" }],
      };
    }
    const valid = await argon2.verify(user.password, password);

    if (!valid)
      return {
        errors: [{ field: "password", message: "Incorrect password" }],
      };

    // Store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session!.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: HttpContext): Promise<Boolean> {
    res.clearCookie("qid");
    return new Promise((resolve) =>
      req.session.destroy((err) => (err ? resolve(false) : resolve(true)))
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: HttpContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) return false;

    const token = uuid.v4();
    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 //one hour
    );
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset your password</a>`
    );

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("newPassword") newPassword: string,
    @Arg("token") token: string,
    @Ctx() { redis, req }: HttpContext
  ): Promise<UserResponse> {
    if (newPassword.length < 6) {
      return {
        errors: [
          { field: "newPassword", message: "Password must be greater than 5" },
        ],
      };
    }
    const FPKey = FORGOT_PASSWORD_PREFIX + token;
    const userId = await redis.get(FPKey);
    if (!userId)
      return {
        errors: [{ field: "token", message: "Token is expired" }],
      };

    const user = await User.findOne(parseInt(userId));
    if (!user)
      return {
        errors: [{ field: "token", message: "User doesnt exist" }],
      };

    await User.update(userId, { password: await argon2.hash(newPassword) });
    redis.del(FPKey);
    req.session.userId = user.id;
    return { user };
  }
}
