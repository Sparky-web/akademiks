import axios from "axios";
import { env } from "~/env";
import axiosRetry from "axios-retry";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

const createProxyAgent = (
  proxyUrl: string | undefined,
): HttpsProxyAgent<string> | SocksProxyAgent | null => {
  if (!proxyUrl || typeof proxyUrl !== "string") {
    return null;
  }

  const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(proxyUrl)
    ? proxyUrl
    : `http://${proxyUrl}`;
  const protocol = new URL(normalizedUrl).protocol;

  if (protocol === "socks:" || protocol === "socks5:") {
    return new SocksProxyAgent(normalizedUrl, { keepAlive: true });
  }

  return new HttpsProxyAgent(normalizedUrl, { keepAlive: true });
};

let activeProxyUrl = env.PROXY_URL;
const proxyAgent = createProxyAgent(activeProxyUrl);

export const client = axios.create(
  proxyAgent
    ? {
        httpsAgent: proxyAgent,
        proxy: false,
        timeout: 30000,
        headers: {
          "Accept-Encoding": "identity",
        },
      }
    : {},
);

export const setRgsuProxyUrl = (proxyUrl: string): boolean => {
  if (proxyUrl === activeProxyUrl) return false;

  const agent = createProxyAgent(proxyUrl);
  if (!agent) throw new Error("Не удалось настроить прокси РГСУ");

  activeProxyUrl = proxyUrl;
  client.defaults.httpsAgent = agent;
  client.defaults.proxy = false;
  return true;
};

axiosRetry(client, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500
    );
  },
  shouldResetTimeout: true, // reset timeout between retries
  onRetry: (_retryCount, _error, requestConfig) => {
    if (requestConfig.signal) {
      requestConfig.signal = AbortSignal.timeout(20000);
    }
  },
});
