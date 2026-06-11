import { withSentryConfig } from "@sentry/nextjs";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
const { env } = await import("./src/env.js");

// import pwa from 'next-pwa';

// const withPWA = pwa({
//     dest: 'public', // defines the output folder for the service worker and related files
//     register: true,
//     skipWaiting: true,
// });

/** @type {import("next").NextConfig} */
const config = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'standalone',
}

export default withSentryConfig(config, {
  sentryUrl: env.SENTRY_URL,
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
  authToken: env.SENTRY_AUTH_TOKEN,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  widenClientFileUpload: true, // покрыть и код из чанков/vendor
});
