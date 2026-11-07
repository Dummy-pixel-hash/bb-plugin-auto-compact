# bb-plugin-auto-compact

Automatically compacts a thread's context window when usage reaches a
configurable percentage (default 80%).

- `server.ts` — the backend: `thread.idle` / `thread.failed` handlers that
  read the thread's usage from `threads.context` and call
  `threads.compact` at or above the threshold, a 15-minute per-thread
  cooldown, `enabled` + `thresholdPercent` settings, `usage` and
  `compact_now` RPCs,
  and a `bb auto-compact` CLI (`status`, `check`, `now`). Threads whose
  provider cannot compact are reported as unsupported and skipped quietly.
- `contract.ts` — the RPC contract shared by the backend and the app.
- `app.tsx` — a **Compact** header action on every thread that compacts the
  visible thread on demand via the `compact_now` RPC. Its usage readout
  refreshes when a turn settles, without polling.
- `skills/auto-compact/SKILL.md` — tells agents how the plugin behaves and
  how to use the CLI. BB imports it into agent threads automatically.
- `server.test.ts` — unit tests over the official fake-plugin harness
  (`@get-bb/plugin-sdk/testing`): threshold, cooldown, disabled state,
  failed threads, and the CLI.

```sh
bb auto-compact status [--json]
bb auto-compact check [thread-id] [--json]
bb auto-compact now [thread-id] [--json]
bb plugin config auto-compact set thresholdPercent 90
```

Run `npm test` for the suite, `npm run check` for the typecheck, and
`bb plugin build` before reinstalling.
