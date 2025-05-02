/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

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

export default config;
