import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { sendRgsuTelegramMessage } from "./telegram";

export type NewRgsuGroup = {
  id: string;
  title: string;
  additionalId: string;
  source: "teachers" | "family";
};

export const rgsuStateDirectory = () =>
  path.join(
    process.env.XDG_STATE_HOME || path.join(homedir(), ".local/state"),
    "akademiks-rgsu",
  );

export function createGroupNotificationQueue(
  directory = rgsuStateDirectory(),
  send = sendRgsuTelegramMessage,
) {
  const file = path.join(directory, "groups-pending-notifications.json");
  const read = async (): Promise<NewRgsuGroup[]> => {
    try {
      return JSON.parse(await readFile(file, "utf8")) as NewRgsuGroup[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  };
  const save = async (groups: NewRgsuGroup[]) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(`${file}.tmp`, JSON.stringify(groups), { mode: 0o600 });
    await rename(`${file}.tmp`, file);
  };
  return {
    async enqueue(group: NewRgsuGroup) {
      const pending = await read();
      if (!pending.some((item) => item.id === group.id)) {
        pending.push(group);
        await save(pending);
      }
    },
    async flush(
      isCommitted: (group: NewRgsuGroup) => Promise<boolean> = async () => true,
    ) {
      let pending = await read();
      const committed: NewRgsuGroup[] = [];
      for (const group of pending) {
        if (await isCommitted(group)) committed.push(group);
      }
      if (committed.length !== pending.length) await save(committed);
      pending = committed;
      while (pending.length) {
        const batch: NewRgsuGroup[] = [];
        let text = "🆕 Академикс РГСУ: добавлены новые группы.\n";
        for (const group of pending) {
          const source =
            group.source === "teachers"
              ? "расписание преподавателей"
              : "поиск по известным группам";
          const line = `\n${group.title} (GUID: ${group.additionalId}). Источник: ${source}.\n`;
          if (text.length + line.length > 3500 && batch.length) break;
          text += line;
          batch.push(group);
        }
        await send(text);
        pending = pending.slice(batch.length);
        await save(pending);
      }
    },
  };
}
