import { getStore } from "@netlify/blobs";
import fs from "fs";
import path from "path";
import seedUsers from "../../src/data/users.json";

interface UserRecord {
  username: string;
  passwordHash: string;
}

const STORE_NAME = "cosmobrasil-users";
const TMP_FILE = path.resolve("/tmp/cosmobrasil-users.json");

function readTmpStore(): UserRecord[] | null {
  try {
    if (fs.existsSync(TMP_FILE)) {
      return JSON.parse(fs.readFileSync(TMP_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function writeTmpStore(users: UserRecord[]): void {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {}
}

export async function getUsers(): Promise<UserRecord[]> {
  const base: UserRecord[] = seedUsers as UserRecord[];

  // Try blob store first, then tmp file
  try {
    const store = getStore(STORE_NAME);
    const raw = await store.get("users");
    if (raw) {
      const overrides = JSON.parse(raw) as UserRecord[];
      for (const override of overrides) {
        const idx = base.findIndex(
          (u) => u.username.toLowerCase() === override.username.toLowerCase()
        );
        if (idx !== -1) {
          base[idx] = { ...base[idx], passwordHash: override.passwordHash };
        }
      }
      return base;
    }
  } catch {}

  // Fallback: tmp file
  const tmp = readTmpStore();
  if (tmp) {
    for (const override of tmp) {
      const idx = base.findIndex(
        (u) => u.username.toLowerCase() === override.username.toLowerCase()
      );
      if (idx !== -1) {
        base[idx] = { ...base[idx], passwordHash: override.passwordHash };
      }
    }
  }

  return base;
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
  // Try blob store first
  try {
    const store = getStore(STORE_NAME);
    await store.set("users", JSON.stringify(users));
    return;
  } catch {}

  // Fallback: tmp file (works in Netlify functions and local dev)
  writeTmpStore(users);
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
