// Lets `node --test` load the app's source directly.
//
// The app imports modules without a file extension, which bundlers resolve but
// Node's ESM loader does not. This hook retries an extensionless relative
// specifier as `.ts` before giving up, so tests can import the real modules
// rather than a copy compiled somewhere else.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const extensionless =
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]sx?$/.test(specifier);

    if (extensionless) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Fall through to the default resolution and its own error.
      }
    }
    return nextResolve(specifier, context);
  },
});
