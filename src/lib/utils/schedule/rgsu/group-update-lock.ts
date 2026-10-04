import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { rgsuStateDirectory } from "./group-notifications";

// Общая блокировка CLI и HTTP: очередь уведомлений хранится в одном файле.
export async function withGroupUpdateLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const directory = rgsuStateDirectory();
  const lock = path.join(directory, "groups-update.lock");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    let active = true;
    try {
      const pid = Number(await readFile(path.join(lock, "pid"), "utf8"));
      if (Number.isInteger(pid) && pid > 0) process.kill(pid, 0);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ESRCH") active = false;
      // Между mkdir и записью PID нельзя считать блокировку устаревшей.
      if (code === "ENOENT")
        active = Date.now() - (await stat(lock)).mtimeMs < 60_000;
    }
    if (active) throw new Error("Группы уже обновляются другим процессом");
    await rm(lock, { recursive: true, force: true });
    await mkdir(lock);
  }
  try {
    await writeFile(path.join(lock, "pid"), String(process.pid));
    return await operation();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
