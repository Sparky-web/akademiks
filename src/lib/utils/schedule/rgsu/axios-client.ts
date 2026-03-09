import axios from "axios";
import tunnel from "tunnel";
import { env } from "~/env";
import axiosRetry from "axios-retry";

interface ProxyConfig {
  host: string;
  port: number;
  proxyAuth: string;
}

const parseProxyUrl = (): ProxyConfig | null => {
  const proxyUrl = env.PROXY_URL;

  if (!proxyUrl || typeof proxyUrl !== "string") {
    return null;
  }

  // Regular expression to match proxy URL pattern
  // Format: (http://)username:password@host:port
  const proxyPattern = /^(?:https?:\/\/)?([^:]+):([^@]+)@([^:]+):(\d+)$/;

  const matches = proxyUrl.match(proxyPattern);

  if (!matches) {
    return null;
  }

  const [, username, password, host, portStr] = matches;

  if (!portStr) return null;

  const port = parseInt(portStr, 10);

  // Validate extracted values
  if (
    !username ||
    !password ||
    !host ||
    !port ||
    isNaN(port) ||
    port <= 0 ||
    port > 65535
  ) {
    return null;
  }

  return {
    host,
    port,
    proxyAuth: `${username}:${password}`,
  };
};

const proxy = parseProxyUrl();

export const client = axios.create(
  proxy
    ? {
        httpsAgent: tunnel.httpsOverHttp({
          proxy,
        }),
        proxy: false,
      }
    : {},
);

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
});
