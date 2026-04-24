import bcrypt from "bcryptjs";

export async function comparePassword(password, storedValue) {
  const plain = String(password ?? "").trim();
  const saved = String(storedValue ?? "").trim();

  if (!saved) return false;

  if (plain === saved) return true;
  if (saved.startsWith("plain:")) return plain === saved.slice(6);

  try {
    if (saved.startsWith("$2a$") || saved.startsWith("$2b$") || saved.startsWith("$2y$")) {
      return await bcrypt.compare(plain, saved);
    }
  } catch {
    return false;
  }

  return false;
}
