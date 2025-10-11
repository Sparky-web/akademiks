import { Settings, DateTime } from "luxon";
import { env } from "~/env";

// Установка временной зоны Екатеринбурга по умолчанию
Settings.defaultZone = "Asia/Yekaterinburg";

if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
  Settings.defaultZone = "Europe/Moscow";
}

// DateTime.now = () => DateTime.fromObject({
//     year: 2024,
//     month: 11,
//     day: 5,
//     hour: 13,
//     minute: 0,
//     second: 0,
// })

export default DateTime;
