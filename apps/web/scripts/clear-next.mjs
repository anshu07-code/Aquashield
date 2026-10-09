/**
 * Clears the Next.js build directory, tolerating Windows OneDrive cloud placeholders
 * (reparse points) that make Next's built-in recursive delete throw EINVAL.
 *
 * Runs automatically before `npm run dev` and `npm run build` via the predev/prebuild
 * hooks. Harmless on macOS/Linux.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".next");

function remove(target) {
  let st;
  try {
    st = fs.lstatSync(target);
  } catch {
    return; // already gone
  }
  if (st.isDirectory() && !st.isSymbolicLink()) {
    let entries = [];
    try {
      entries = fs.readdirSync(target);
    } catch {
      // unreadable (un-materialised cloud placeholder) — remove the link itself
    }
    for (const entry of entries) remove(path.join(target, entry));
    try {
      fs.rmdirSync(target);
    } catch {
      /* leave it; next dev will retry */
    }
  } else {
    try {
      fs.unlinkSync(target);
    } catch {
      /* leave it */
    }
  }
}

remove(dir);
console.log("cleared .next");
