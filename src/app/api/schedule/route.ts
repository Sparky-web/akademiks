import parseBackground from "~/lib/utils/schedule/parse-background";
import { isCronAuthorized } from "~/lib/utils/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 1800;

let activeScheduleUpdate: Promise<void> | null = null;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json(
      { status: "error", error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (activeScheduleUpdate) {
    return Response.json(
      { status: "skipped", reason: "Расписание уже обновляется" },
      { status: 409 },
    );
  }

  const startedAt = Date.now();
  activeScheduleUpdate = parseBackground();

  try {
    await activeScheduleUpdate;
    console.log("Расписание обновлено");
    return Response.json({
      status: "ok",
      durationMs: Date.now() - startedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Ошибка фонового обновления расписания:", message);
    return Response.json({ status: "error", error: message }, { status: 500 });
  } finally {
    activeScheduleUpdate = null;
  }
}
