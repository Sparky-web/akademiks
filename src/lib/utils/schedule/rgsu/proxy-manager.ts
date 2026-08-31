import axios from "axios";

import { env } from "~/env";

import { setRgsuProxyUrl } from "./axios-client";
import { sendRgsuTelegramMessage } from "./telegram";

const PX6_API_URL = "https://px6.link/api";
const PROXY_DESCRIPTION = "akademiks-rgsu";
const PENDING_NOTIFICATION_DESCRIPTION = "akademiks-rgsu-pending";
const PROXY_PERIOD_DAYS = 7;
const MIN_ROTATION_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
const MIN_PROXY_VALIDITY_MS = 30 * 60 * 1000;

interface Px6Proxy {
  id: string;
  version?: string;
  host: string;
  port: string;
  user: string;
  pass: string;
  type: "auto" | "http" | "socks";
  country?: string;
  descr?: string;
  active: string;
  unixtime: number | string;
  unixtime_end: number | string;
}

interface Px6Response {
  status: "yes" | "no";
  error?: string;
  list?: Record<string, Px6Proxy>;
}

export interface RgsuProxyResult {
  rotated: boolean;
  proxyChanged: boolean;
  expiresAt?: Date;
  cooldownUntil?: Date;
}

let managedProxyId: string | null = null;
let proxyOperation: Promise<RgsuProxyResult> | null = null;
let lastBlockRecovery:
  | { completedAt: number; result: RgsuProxyResult }
  | undefined;

const getTimestamp = (value: number | string): number => Number(value) * 1000;

const requestPx6 = async (
  method: "getproxy" | "buy" | "setdescr",
  params: Record<string, string | number>,
): Promise<Px6Response> => {
  if (!env.PX6_API_KEY) {
    throw new Error("PX6_API_KEY не настроен");
  }

  try {
    const response = await axios.get<Px6Response>(
      `${PX6_API_URL}/${encodeURIComponent(env.PX6_API_KEY)}/${method}`,
      { params, timeout: 20000 },
    );

    if (response.data.status !== "yes") {
      throw new Error(response.data.error || "неизвестная ошибка API");
    }

    return response.data;
  } catch {
    throw new Error(`PX6 не выполнил запрос ${method}`);
  }
};

const getManagedProxies = async (): Promise<Px6Proxy[]> => {
  const response = await requestPx6("getproxy", {
    state: "all",
    limit: 1000,
  });

  return Object.values(response.list ?? {}).filter(
    (proxy) =>
      proxy.version === "4" &&
      proxy.country === "ru" &&
      (proxy.descr === PROXY_DESCRIPTION ||
        proxy.descr === PENDING_NOTIFICATION_DESCRIPTION),
  );
};

const getNewestProxy = (proxies: Px6Proxy[]): Px6Proxy | undefined =>
  proxies.toSorted((left, right) => {
    return getTimestamp(right.unixtime) - getTimestamp(left.unixtime);
  })[0];

const getActiveProxy = (proxies: Px6Proxy[]): Px6Proxy | undefined =>
  getNewestProxy(
    proxies.filter(
      (proxy) =>
        proxy.active === "1" &&
        getTimestamp(proxy.unixtime_end) > Date.now() + MIN_PROXY_VALIDITY_MS,
    ),
  );

const buildProxyUrl = (proxy: Px6Proxy): string => {
  const protocol = proxy.type === "http" ? "http" : "socks5";
  const user = encodeURIComponent(proxy.user);
  const password = encodeURIComponent(proxy.pass);
  return `${protocol}://${user}:${password}@${proxy.host}:${proxy.port}`;
};

const configureProxy = (proxy: Px6Proxy): boolean => {
  const idChanged = managedProxyId !== proxy.id;
  const urlChanged = setRgsuProxyUrl(buildProxyUrl(proxy));
  managedProxyId = proxy.id;
  return idChanged || urlChanged;
};

const sendRotationNotification = async (
  reason: string,
  proxy: Px6Proxy,
): Promise<void> => {
  const expiresAt = new Date(getTimestamp(proxy.unixtime_end));
  const expiresText = expiresAt.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
  });
  await sendRgsuTelegramMessage(
    [
      "🔄 Академикс РГСУ: прокси заменён.",
      `Причина: ${reason}.`,
      `Действует до: ${expiresText} МСК.`,
    ].join("\n"),
  );
};

const markNotificationSent = async (proxy: Px6Proxy): Promise<void> => {
  await requestPx6("setdescr", {
    ids: proxy.id,
    new: PROXY_DESCRIPTION,
  });
  proxy.descr = PROXY_DESCRIPTION;
};

const sendPendingNotification = async (proxy: Px6Proxy): Promise<void> => {
  if (proxy.descr !== PENDING_NOTIFICATION_DESCRIPTION) return;
  await sendRotationNotification("повтор уведомления после ротации", proxy);
  await markNotificationSent(proxy);
};

const buyProxy = async (reason: string): Promise<RgsuProxyResult> => {
  const response = await requestPx6("buy", {
    count: 1,
    period: PROXY_PERIOD_DAYS,
    country: "ru",
    version: 4,
    descr: PENDING_NOTIFICATION_DESCRIPTION,
  });
  const proxy = Object.values(response.list ?? {})[0];

  if (
    !proxy?.id ||
    !proxy.host ||
    !proxy.port ||
    !proxy.user ||
    !proxy.pass ||
    !proxy.unixtime ||
    !proxy.unixtime_end
  ) {
    throw new Error("PX6 вернул некорректный IPv4-прокси");
  }

  proxy.version = "4";
  proxy.country = "ru";
  proxy.descr = PENDING_NOTIFICATION_DESCRIPTION;

  const proxyChanged = configureProxy(proxy);
  await sendRotationNotification(reason, proxy);
  await markNotificationSent(proxy);

  return {
    rotated: true,
    proxyChanged,
    expiresAt: new Date(getTimestamp(proxy.unixtime_end)),
  };
};

const rotateInternal = async (
  reason: string,
  knownProxies?: Px6Proxy[],
): Promise<RgsuProxyResult> => {
  const proxies = knownProxies ?? (await getManagedProxies());
  const newestProxy = getNewestProxy(proxies);

  if (newestProxy) {
    const cooldownUntil = new Date(
      getTimestamp(newestProxy.unixtime) + MIN_ROTATION_INTERVAL_MS,
    );
    if (cooldownUntil.getTime() > Date.now()) {
      const activeProxy = getActiveProxy(proxies);
      return {
        rotated: false,
        proxyChanged: activeProxy ? configureProxy(activeProxy) : false,
        expiresAt: activeProxy
          ? new Date(getTimestamp(activeProxy.unixtime_end))
          : undefined,
        cooldownUntil,
      };
    }
  }

  return buyProxy(reason);
};

const runProxyOperation = (
  operation: () => Promise<RgsuProxyResult>,
): Promise<RgsuProxyResult> => {
  if (proxyOperation) return proxyOperation;

  proxyOperation = operation().finally(() => {
    proxyOperation = null;
  });
  return proxyOperation;
};

export const ensureRgsuProxy = (): Promise<RgsuProxyResult> => {
  if (!env.PX6_API_KEY) {
    return Promise.resolve({ rotated: false, proxyChanged: false });
  }

  return runProxyOperation(async () => {
    const proxies = await getManagedProxies();
    const activeProxy = getActiveProxy(proxies);
    if (activeProxy) {
      await sendPendingNotification(activeProxy);
      return {
        rotated: false,
        proxyChanged: configureProxy(activeProxy),
        expiresAt: new Date(getTimestamp(activeProxy.unixtime_end)),
      };
    }

    return rotateInternal("истёк срок или нет активного прокси", proxies);
  });
};

export const rotateRgsuProxyAfterBlock = (): Promise<RgsuProxyResult> => {
  if (
    lastBlockRecovery &&
    Date.now() - lastBlockRecovery.completedAt < 60_000
  ) {
    return Promise.resolve(lastBlockRecovery.result);
  }

  return runProxyOperation(() =>
    rotateInternal("РГСУ отклонил запрос как запрос бота"),
  ).then((result) => {
    lastBlockRecovery = { completedAt: Date.now(), result };
    return result;
  });
};
