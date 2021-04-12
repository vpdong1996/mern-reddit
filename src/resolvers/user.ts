import { User } from "../entities/User";
import { EmContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
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
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { em }: EmContext
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
    await em.persistAndFlush(user);
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { em }: EmContext
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
    return { user };
  }
}
