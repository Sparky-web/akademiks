import { Settings, DateTime } from "luxon";
import { env } from "~/env";

// Установка временной зоны Екатеринбурга по умолчанию
Settings.defaultZone = "Asia/Yekaterinburg";

if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
  Settings.defaultZone = "Europe/Moscow";
}

// DateTime.now = () =>
//   DateTime.fromObject({
//     year: 2026,
//     month: 2,
//     day: 2,
//     hour: 9,
//     minute: 0,
//   });

export default DateTime;
