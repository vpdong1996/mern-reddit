import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { PostDto } from "../types/PostDto";
import { HttpContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";
import { userLoader } from "../utils/createUserLoader";

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field(() => Boolean)
  hasMore: boolean;
}
@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  async creator(@Root() post: Post) {
    return await userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { req, updootLoader }: HttpContext
  ) {
    if (!req.session.userId) return null;

    const data = await updootLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });
    console.log("RETURN UPDOOT HERE", data);
    return data ? data?.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: HttpContext
  ) {
    const { userId } = req.session;
    const realValue = value !== -1 ? 1 : -1;
    const updoot = await Updoot.findOne({ where: { postId, userId } });

    if (updoot && updoot.value !== realValue) {
      await getConnection().transaction(async (trans) => {
        await trans.query(`
          update updoot 
          set value = ${realValue}
          where "postId" = ${postId} and "userId" = ${userId}
        `);
        await trans.query(`
          update post
          set points = points + ${2 * realValue}
          where id = ${postId} 
        `);
      });
    } else {
      await getConnection().transaction(async (trans) => {
        await trans.query(`
          insert into updoot ("userId", "postId", "value")
          values (${userId}, ${postId}, ${realValue})
        `);
        await trans.query(`
          update post
          set points = points + ${realValue}
          where id = ${postId}
        `);
      });
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | undefined,
    @Ctx() { req }: HttpContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const { userId } = req.session;

    const replacements = [realLimitPlusOne] as any[];

    if (cursor) replacements.push(new Date(parseInt(cursor)));
    console.log("USER ID", userId);
    const posts = await getConnection().query(
      `
      select p.*
      from post p
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      replacements
    );
    const isHasMore = posts.length === realLimitPlusOne;
    return {
      posts: posts.splice(0, realLimit),
      hasMore: isHasMore,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return await Post.findOne(id, { relations: ["creator"] });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("postDto") postDto: PostDto,
    @Ctx() { req }: HttpContext
  ): Promise<Post | undefined> {
    return await Post.create({
      ...postDto,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: false }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });

    if (!post) return null;
    if (title) {
      await Post.update({ id }, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id", () => Int) id: number): Promise<Post | Boolean> {
    await Post.delete(id);
    return true;
  }
}
