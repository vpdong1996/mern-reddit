import { User } from "../entities/User";
import { HttpContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import argon2 from "argon2";

@InputType()
class UsernamePasswordDto {
  @Field()
  username: string;

  @Field()
  password: string;
}

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

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async getInfo(@Ctx() { req, em }: HttpContext): Promise<User | null> {
    if (!req.session.userId) return null;

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { em }: HttpContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    if (username.length <= 2) {
      return {
        errors: [
          { field: "username", message: "Username must be greater than 2" },
        ],
      };
    }

    if (password.length <= 5) {
      return {
        errors: [
          { field: "password", message: "Password must be greater than 5" },
        ],
      };
    }

    const hashedPassword = await argon2.hash(password);
    const user = em.create(User, { username, password: hashedPassword });
    try {
      await em.persistAndFlush(user);
    } catch (error) {
      return {
        errors: [{ field: error.table, message: error.detail }],
      };
    }
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { em, req }: HttpContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [{ field: "username", message: "Username doesnt exist!" }],
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
}
