import { writeFile } from "node:fs/promises";
import { db } from "../src/server/db";
import { updateRgsuGroupIds } from "../src/lib/utils/schedule/rgsu/parse-groups";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const addOnly = args.includes("--add-only");
const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

try {
  if (process.env.NEXT_PUBLIC_UNIVERSITY !== "RGSU") {
    throw new Error("Обновление групп разрешено только для РГСУ");
  }
  if (
    args.some(
      (arg, index) =>
        arg !== "--dry-run" &&
        arg !== "--add-only" &&
        arg !== "--output" &&
        !(outputIndex >= 0 && index === outputIndex + 1),
    )
  ) {
    throw new Error(
      "Допустимы параметры --dry-run, --add-only и --output <путь>",
    );
  }
  if (outputIndex >= 0 && (!output || output.startsWith("--"))) {
    throw new Error("Укажите путь после --output");
  }
  const startedAt = Date.now();
  const result = await updateRgsuGroupIds({
    dryRun,
    addOnly,
    teacherConcurrency: 3,
  });
  const report = { ...result, durationMs: Date.now() - startedAt };
  if (output)
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  if (result.errors.length) process.exitCode = 1;
} catch (error) {
  console.error(
    "Обновление групп РГСУ не завершено:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
