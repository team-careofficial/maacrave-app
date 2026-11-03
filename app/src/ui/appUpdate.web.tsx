/** The website is always up to date, so there's nothing to check. */
export function AppUpdate() { return null; }
export const BUILD = { sha: process.env.EXPO_PUBLIC_BUILD_SHA || '', builtAt: process.env.EXPO_PUBLIC_BUILD_TIME || '' };
