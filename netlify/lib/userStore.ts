import { getStore } from "@netlify/blobs";
import seedUsers from "../../src/data/users.json" assert { type: "json" };

interface UserRecord {
  username: string;
  passwordHash: string;
}

const STORE_NAME = "cosmobrasil-users";

export async function getUsers(): Promise<UserRecord[]> {
  try {
    const store = getStore(STORE_NAME);
    const raw = await store.get("users");
    if (raw) {
      return JSON.parse(raw) as UserRecord[];
    }
  } catch {
    // store unavailable (local dev or missing env), fall back to seed
  }
  return seedUsers as UserRecord[];
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.set("users", JSON.stringify(users));
  } catch {
    // store unavailable in local dev; handled by the Express route
    throw new Error("BLOB_STORE_UNAVAILABLE");
  }
}

export async function updatePassword(
  username: string,
  newHash: string
): Promise<boolean> {
  const users = await getUsers();
  const idx = users.findIndex(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (idx === -1) return false;
  users[idx] = { ...users[idx], passwordHash: newHash };
  await saveUsers(users);
  return true;
}
