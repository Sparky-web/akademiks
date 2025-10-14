import { NextRequest, NextResponse } from "next/server";
import { updateRgsuGroupIds } from "~/lib/utils/schedule/rgsu/parse-groups";

export async function GET(request: NextRequest) {
  try {
    console.log("Начинаем обновление ID групп RGSU...");

    const result = await updateRgsuGroupIds();

    console.log(
      `Обновление завершено. Обновлено: ${result.updated}/${result.total}`,
    );

    return NextResponse.json({
      success: true,
      message: `Обновлено ${result.updated} из ${result.total} групп`,
      data: {
        updated: result.updated,
        total: result.total,
        errors: result.errors,
      },
    });
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
  }
}
