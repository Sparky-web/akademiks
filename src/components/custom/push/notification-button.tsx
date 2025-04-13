"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Bell, Check, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationButton() {
  const { mutateAsync: subscribe } = api.push.subscribe.useMutation();
  const { mutateAsync: unsubscribe } = api.push.unsubscribe.useMutation();

  const { mutateAsync: test, isPending } = api.push.test.useMutation();

  const utils = api.useUtils();

  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    const sub = await registration.pushManager.getSubscription();

    if (!sub) return;

    const isActive = await utils.push.isSubscriptionInDatabase.fetch({
      endpoint: sub.endpoint,
    });

    if (isActive) setSubscription(sub);
    else await sub.unsubscribe();
  }

  async function subscribeToPush() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      setSubscription(sub);
      const serializedSub = JSON.parse(JSON.stringify(sub));
      console.log(serializedSub);
      await subscribe({
        keys: JSON.stringify(serializedSub.keys),
        endpoint: serializedSub.endpoint,
      });
    } catch (e) {
      toast.error("Ошибка подписки на уведомления: " + e.message);
      console.error(e);
    }
    setIsLoading(false);
  }

  async function unsubscribeFromPush() {
    setIsLoading(true);
    try {
      if (!subscription) throw new Error("Не найдена подписка на push");

      await unsubscribe({
        endpoint: subscription?.endpoint,
      });

      await subscription?.unsubscribe();

      setSubscription(null);
    } catch (e) {
      toast.error("Ошибка отписки от уведомлений: " + e.message);
      console.error(e);
    }
    setIsLoading(false);
  }

  if (!isSupported) {
    return "";
  }

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              `h-10 w-10 rounded-lg transition-all duration-300 ease-in-out`,
              "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-600 hover:to-pink-600 hover:text-white hover:shadow-xl",
            )}
          >
            <Bell className={`h-5 w-5 ${subscription ? "" : ""}`} />
            <span className="sr-only">
              {subscription ? "Disable notifications" : "Enable notifications"}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="leading-6">
            Уведомления об изменениях в расписании
          </DialogTitle>
          <DialogDescription className="mt-2 leading-5">
            Уведомления будут приходить если:
            <br />
            - добавлено расписание на следующую неделю
            <br />- есть изменения в текущем расписании
          </DialogDescription>
          <div className="mt-4 flex items-center gap-4">
            <Switch
              checked={!!subscription}
              disabled={isLoading}
              onCheckedChange={(e) => {
                if (subscription) {
                  unsubscribeFromPush();
                } else {
                  subscribeToPush();
                }
              }}
            />

            <div className="flex items-center gap-3 text-sm font-semibold">
              {isLoading && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Загрузка...</span>
                </>
              )}

              {!isLoading && subscription && (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Уведомления включены</span>
                </>
              )}
              {!isLoading && !subscription && "Включить уведомления"}
            </div>
          </div>

          {subscription && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await test();
                } catch (e) {
                  toast.error("Ошибка проверки уведомлений: " + e.message);
                }
              }}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              Проверить уведомления
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  } else {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              `h-10 w-10 rounded-lg transition-all duration-300 ease-in-out`,
              "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-600 hover:to-pink-600 hover:text-white hover:shadow-xl",
            )}
          >
            <Bell className={`h-5 w-5 ${subscription ? "" : ""}`} />
            <span className="sr-only">
              {subscription ? "Disable notifications" : "Enable notifications"}
            </span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="leading-6">
              Уведомления об изменениях в расписании
            </DrawerTitle>
            <DrawerDescription className="mt-2 leading-5">
              Уведомления будут приходить если добавлено расписание на следующую
              неделюили есть изменения в текущем расписании
            </DrawerDescription>
          </DrawerHeader>
          <div className="mt-4 flex items-center justify-center gap-4 px-4">
            <Switch
              checked={!!subscription}
              disabled={isLoading}
              onCheckedChange={(e) => {
                if (subscription) {
                  unsubscribeFromPush();
                } else {
                  subscribeToPush();
                }
              }}
            />

            <div className="flex items-center gap-3 text-sm font-semibold">
              {isLoading && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Загрузка...</span>
                </>
              )}

              {!isLoading && subscription && (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Уведомления включены</span>
                </>
              )}
              {!isLoading && !subscription && "Включить уведомления"}
            </div>
          </div>

          <DrawerFooter>
            {subscription && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await test();
                  } catch (e) {
                    toast.error("Ошибка проверки уведомлений: " + e.message);
                  }
                }}
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
                Проверить уведомления
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
}
