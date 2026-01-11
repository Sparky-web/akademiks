import { Settings, DateTime } from "luxon";
import { env } from "~/env";

// Установка временной зоны Екатеринбурга по умолчанию
Settings.defaultZone = "Asia/Yekaterinburg";

if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
  Settings.defaultZone = "Europe/Moscow";
}

export default DateTime;
