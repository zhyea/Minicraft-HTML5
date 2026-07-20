/**
 * TypeScript shim for single-file Vue components.
 *
 * `tsc --noEmit` (the `typecheck` script) does not understand `.vue` files;
 * it only needs to resolve the module so that `import App from './ui/App.vue'`
 * in main.ts type-checks. The component internals are type-checked by the
 * Vue SFC toolchain, not by tsc, which is the standard Vite + Vue setup.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}
