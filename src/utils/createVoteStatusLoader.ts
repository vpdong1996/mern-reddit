import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";

// Fomart
// [{postId: 1, userId: 4}, {postId: 3, userId: 2},...]
// [{postId: 1, userId: 4, value: 1}, {postId: 3, userId: 2, value: -1},...]

async function batchFunction(keys: any) {
  const updoots = await Updoot.findByIds(keys as any);
  // updootIdToUpdoot --- `1|4` `3|2`
  const updootIdToUpdoot: Record<string, Updoot> = updoots.reduce(
    (acc, curr) => {
      return { ...acc, [`${curr.postId}|${curr.userId}`]: curr };
    },
    {}
  );

  const sortedUpdoots = keys.map(
    (key: { postId: any; userId: any }) =>
      updootIdToUpdoot[`${key.postId}|${key.userId}`]
  );
  return sortedUpdoots;
}

export const updootLoader = new DataLoader<
  { postId: number; userId: number },
  Updoot | null
>(batchFunction);
