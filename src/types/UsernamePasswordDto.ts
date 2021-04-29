import { InputType, Field } from "type-graphql";

@InputType()
export class UsernamePasswordDto {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}
