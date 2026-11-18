// The Millennium build needs only Steam's router and module finder from @decky/ui, not its
// components: this keeps the bundle small and avoids evaluating Steam components at load.
export { Navigation, Router } from '../../node_modules/@decky/ui/dist/modules/Router.js';
export { findModuleChild } from '../../node_modules/@decky/ui/dist/webpack.js';
