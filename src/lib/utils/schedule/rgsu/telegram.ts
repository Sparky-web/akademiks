import axios from "axios";

import { env } from "~/env";

export async function sendRgsuTelegramMessage(text: string): Promise<void> {
  const token = env.RGSU_PROXY_ROTATION_TELEGRAM_BOT_TOKEN;
  const chatId = env.RGSU_PROXY_ROTATION_TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Telegram для уведомлений РГСУ не настроен");
  }

  const url = `https://api-telegram.studentto.ru/bot${token}/sendMessage`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await axios.post(
        url,
        {
          chat_id: chatId,
          text,
        },
        { timeout: 15000 },
      );
      return;
    } catch {
      if (attempt === 3) {
        throw new Error("Не удалось отправить уведомление РГСУ в Telegram");
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}
