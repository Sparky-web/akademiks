import { NextResponse } from "next/server";
import { isCronAuthorized } from "~/lib/utils/cron-auth";
import { updateRgsuGroupIds } from "~/lib/utils/schedule/rgsu/parse-groups";

export const maxDuration = 21600;

let activeGroupUpdate: ReturnType<typeof updateRgsuGroupIds> | null = null;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (activeGroupUpdate) {
    return NextResponse.json(
      { success: false, error: "Группы уже обновляются" },
      { status: 409 },
    );
  }

  try {
    console.log("Начинаем обновление ID групп RGSU...");

    activeGroupUpdate = updateRgsuGroupIds();
    const result = await activeGroupUpdate;

    console.log(
      `Обновление завершено. Обновлено: ${result.updated}/${result.total}, добавлено: ${result.created}`,
    );

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        message: `Обновлено ${result.updated} из ${result.total} групп, добавлено: ${result.created}`,
        data: result,
      },
      { status: result.errors.length ? 502 : 200 },
    );
  } catch (error) {
    console.error("Ошибка при обновлении ID групп:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ошибка при обновлении ID групп",
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    );
  } finally {
    activeGroupUpdate = null;
  }
}
