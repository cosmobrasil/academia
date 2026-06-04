import { getStore } from "@netlify/blobs";
import seedUsers from "../../src/data/users.json";

interface UserRecord {
  username: string;
  passwordHash: string;
}

const STORE_NAME = "cosmobrasil-users";

export async function getUsers(): Promise<UserRecord[]> {
  // Start with seed data as authoritative base
  const base: UserRecord[] = seedUsers as UserRecord[];

  try {
    const store = getStore(STORE_NAME);
    const raw = await store.get("users");
    if (raw) {
      const overrides = JSON.parse(raw) as UserRecord[];
      // Merge: apply any password changes from blob store on top of seed
      for (const override of overrides) {
        const idx = base.findIndex(
          (u) => u.username.toLowerCase() === override.username.toLowerCase()
        );
        if (idx !== -1) {
          base[idx] = { ...base[idx], passwordHash: override.passwordHash };
        }
      }
    }
  } catch {
    // store unavailable, use seed as-is
  }

  return base;
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.set("users", JSON.stringify(users));
  } catch {
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
