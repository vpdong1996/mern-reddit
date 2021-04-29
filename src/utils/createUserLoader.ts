import DataLoader from "dataloader";
import { User } from "../entities/User";

async function batchFunction(keys: any) {
  const users = await User.findByIds(keys as number[]);
  const userIdToUser: Record<number, User> = users.reduce((acc, curr) => {
    return { ...acc, [curr.id]: curr };
  }, {});

  const sortedUsers = keys.map((userId: number) => userIdToUser[userId]);
  console.log("Result", users);
  return sortedUsers;
}

export const userLoader = new DataLoader<number, User>(batchFunction);
