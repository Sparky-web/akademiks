import webPush from "web-push";
import { env } from "~/env";
import { db } from "~/server/db";

webPush.setVapidDetails(
  "mailto:babinovvlad@gmail.com",
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

export default async function sendNotification(
  userId: string,
  title: string,
  body: string,
) {
  const subscriptions = await db.pushSubscription.findMany({
    where: {
      userId: userId,
    },
  });

  if (!subscriptions.length) throw new Error("Не найдена подписка на push");

  const payload = JSON.stringify({
    title: title,
    body: body,
    icon: "/ios/64.png",
  });

  const countSubs = subscriptions.length;
  let erroredSubs = 0;

  for (let subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: JSON.parse(subscription.keys),
        },
        payload,
      );
    } catch (e) {
      erroredSubs++;
    }
  }

  if (erroredSubs === countSubs)
    throw new Error("Не удалось отправить push-уведомления на все подписки");

  return "ok";
}
