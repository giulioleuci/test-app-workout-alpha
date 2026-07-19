# Phase 4 presentation dependency inventory

This inventory records the graph review performed for the remaining presentation-to-service imports. It is a migration map, not a waiver for dependencies that are classified as workflows or effects.

| Dependency group | Classification | Phase 4 decision |
| --- | --- | --- |
| Analytics, one-rep-max, RPE, body-weight, performance, volume, duration, muscle-deduction, set-count, warmup, and session-rotation calculations | Pure deterministic calculation | Keep callable by presentation while they are side-effect free; move to `domain` or clearly named pure utilities when each owning feature is next edited. |
| Dashboard summary/calendar calculations and CSV workout export shaping | Pure query/formatting calculation | Keep as read-only presentation helpers; no use case is needed unless persistence or export transport is introduced. |
| Rest notifications and keep-awake control | Device effect | Implemented through `NativeDevicePort`, application use cases, the native infrastructure gateway, and `useNativeDeviceViewModel`. |
| Auth PIN, account deletion, exercise variant creation, pending-session finish, substitution activation, template/workout/history save, session cloning/mutation, and system reset | Multi-step business workflow | Remain candidates for feature-specific use cases and view models. Active-session commands are deferred to Phase 5 to preserve optimistic-update behavior. |
| Query hooks, dialog state, loading/error state, and cache invalidation | Presentation view-model concern | Keep in hooks/view models; they must not acquire persistence, device, or parsing responsibilities. |

The graph review found direct device imports in `RestTimer`, `SetInputActions`, `useSetCompletionHandlers`, and `useActiveSessionViewModel`; all now use the presentation-facing native-device view model. `capacitorInit` invokes the same application command during bootstrapping.
