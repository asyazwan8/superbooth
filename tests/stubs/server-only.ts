/**
 * `server-only` is a build-time guard that stops server modules being pulled
 * into a client bundle. Under Vitest there is no bundler and no client, so it
 * has nothing to guard and does not resolve — aliased to this empty module so
 * server-side units stay testable.
 */
export {};
