# Reference: Mustry Screensaver

Engineering detail: how the module works, its props, how to build and test
it. The product page is the [README](../README.md); the plan it came from is
[product-spec.md](product-spec.md).

## What is built (v0.1)

One component, the **Idle Guard** (`mustrysolutions.perspective.screensaver.idleguard`).

| Area | State |
|---|---|
| Idle detection in the browser (pointer with jitter threshold, touch, keys, wheel, tab visibility) | Done |
| Outputs (`output.idle`, `idleSince`, `lastInput`, `mode`, `wakeCause`, `feedOk`, `alarms`) and events (`onIdle`, `onWake`) | Done |
| Overlay in a `document.body` portal, page stays mounted | Done |
| The waking gesture never reaches the page | Done, e2e-tested and mutation-checked |
| Modes: starfield, pipes, clock, blank, external | Done |
| Alarm policy: wake, pin banner, Critical always wakes, fail open on a stale feed | Done, unit- and e2e-tested |
| Burn-in: drifting text, night dimming while idle | Done |
| Screen Wake Lock (HTTPS only) | Done, not e2e-tested (the dev gateway is plain HTTP) |
| Designer: inert, shows a chip | Done |

### Differences from the spec

Deliberate, following the review of the spec before building:

- **Not in v0.1:** the Andon Board component, the rotation mode, the privacy
  lock, and the opt-in page orbit (`burnIn.orbitPage`). The Andon board and
  rotation duplicate what integrators already build as views (the `external`
  mode plus their own view covers it); the lock is the riskiest spike and the
  part most likely to be mistaken for a security control; page orbit needs
  spike 5 first.
- **Component id** follows the sibling modules (`mustrysolutions.perspective.*`)
  instead of the spec's `mustry.idle.guard`. Changing it later breaks saved
  views, so decide before a release.
- **The alarm feed polls** the gateway's alarm status once a second, once per
  gateway, instead of an `AlarmListener` per delegate. `AlarmManager.addListener`
  takes one source path, so a listener per guard would not cover "every alarm",
  and one query per tick costs the same whatever the number of displays.
- **Dimming applies only while idle.** The spec dims the wall on a schedule;
  dimming a screen someone is using is not what an operator wants.
- **The demo pipes are not the plant's pipe topology.** They are generic
  pipes, one per bound state/flow. Drawing the real routing needs the P&ID,
  which is the HMI Kit fly-through idea, not this module.

## Architecture

```
Browser (Perspective client)                       Gateway
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│ IdleGuard.tsx (React class)          │  model   │ GuardModelDelegate (one per guard)    │
│  window capture listeners → input()  │  events  │  screensaver-subscribe → AlarmFeed    │
│  250 ms tick → tick() (idleLogic.ts) │◄────────►│ AlarmFeed (one per gateway)           │
│  evaluateAlarms() on the last feed   │          │  1 s poll of AlarmManager.queryStatus │
│  portal on document.body:            │          │  per-guard SourceFilter + summary     │
│   starfield / pipes (canvas, 30 fps) │          │  push on change, heartbeat every 2 s  │
│   clock / blank / banner / dim       │          │ ScreensaverGatewayHook                │
│ guardDelegate.ts (store delegate)    │          │  registers component + delegate       │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

### Browser

- `idleLogic.ts`: pure, node-tested. The idle state machine (`tick`,
  `input`), the alarm policy (`evaluateAlarms`), the jitter check, the dim
  window and the drift path.
- `guardProps.ts`: PropertyTree → typed props.
- `guardDelegate.ts`: the store delegate; parses feed messages and stamps them
  with the **browser's** clock (staleness never compares two clocks).
- `IdleGuard.tsx`: wires it together.
- `modes/`: `pipesSim.ts` (pure, tested), `pipes.ts`, `starfield.ts` and
  `frameLoop.ts` (canvas renderers, 30 fps cap, no work in hidden tabs).

**Input handling.** All listeners are on `window` in the capture phase, so
they run before anything on the page. While the overlay is up, a pointer-down,
touch-start, key-down or wheel wakes the page and is stopped
(`preventDefault` + `stopImmediatePropagation`). The rest of that gesture
(pointer/mouse up, click, touch-end, key-up, ...) is swallowed for 700 ms, and
the overlay fades out over 300 ms while still catching input. Without this a
release-acting control under the overlay (a jog button, `onMouseUp` scripts)
would fire from the tap that woke the screen. Mouse movement wakes without
being stopped. Wakes that are not input (alarm, stale feed, disabled) drop the
overlay at once.

**Alarm policy.** From the last feed message:

- `feedOk`: a message arrived within `alarm.staleAfterSec`. Without it the
  guard never covers the page and removes a cover that is up (fail open). It
  also re-sends its subscription every 5 s, which recovers a session that
  reconnected and lost its gateway delegate.
- `wake`: an active alarm at or above `alarm.wakePriority` (clamped so Critical
  always qualifies). Wakes the page and blocks idling while active. Acked
  alarms count unless `alarm.includeAcked` is off, except Critical, which
  always counts.
- `pin`: between `pinPriority` and `wakePriority`: a banner over the idle mode,
  and the night dimming lifts.

**One guard per page.** The first guard to mount owns the page; another
instance stays inert. Put it in a shared dock so it survives navigation.

**Reused component stores** (see Doom's SDK notes): the guard acts only after
`timeoutSec` (minimum 5 s), so props from a previous view are long replaced by
then; subscriptions are re-sent whenever `alarm.sources` changes.

### Gateway

- `AlarmFeed`: one daemon thread per gateway. Reads active, unshelved alarms
  each second, builds each subscriber's summary with its own `SourceFilter`,
  sends it when it changed or every 2 s as a heartbeat. If the query throws it
  sends nothing, so every guard fails open.
- `AlarmSummary`: counts by priority (active, and unacknowledged), plus the
  top N alarms (unacknowledged first, then priority, then newest).
- `SourceFilter`: `alarm.sources` globs (`*` only), case-insensitive, against
  the display path or the source path.
- `GuardModelDelegate`: subscribes on `screensaver-subscribe`, unsubscribes on
  shutdown.

Event names live in `guardDelegate.ts` and `GuardModelDelegate.java`; change
both.

## Props

The full schema with descriptions is
[`idleguard.props.json`](../common/src/main/resources/idleguard.props.json).

| Prop | Default | |
|---|---|---|
| `config.enabled` | true | Off wakes the page and stops detection |
| `config.timeoutSec` | 600 | Minimum 5 |
| `config.mode` | starfield | starfield, pipes, clock, blank, external |
| `config.wakeOnMove` / `moveThresholdPx` | true / 8 | Mouse movement counts beyond the threshold |
| `config.wakeLock` | false | Screen Wake Lock; HTTPS only |
| `alarm.wakePriority` | High | Critical always wakes |
| `alarm.pinPriority` | Medium | Banner between pin and wake |
| `alarm.includeAcked` | true | |
| `alarm.sources` | [] | Glob patterns; empty = all alarms |
| `alarm.staleAfterSec` | 8 | Fail open after this much feed silence (min 3) |
| `burnIn.drift` | true | Text wanders on a 7/11-minute Lissajous path |
| `burnIn.dim` | off, 22:00–06:00, 0.4 | While idle; lifted by a pinned alarm |
| `modes.clock` | | `title`, `showSeconds` |
| `modes.starfield` | | `speed` (bind a line rate), `color`, `density`, `caption` |
| `modes.pipes` | demo set | `pipes[]` of `{label, state, flow, color}` (max 12), `legend`, `resetAfterSec` |

Events: `onIdle {mode, idleSince}`, `onWake {cause, idleForMs}` with cause
`input`, `alarm`, `feed-stale` or `disabled`.

## Build and test

```bash
./gradlew build                 # .modl + jest (web) + JUnit (gateway)
cd web && npx tsc --noEmit && npm test
ops/fresh.sh                    # unattended dev gateway on :9388 (admin / password)
ops/deploy.sh                   # reload a new build
ops/e2e.sh [--fresh|--no-deploy] # Playwright suite (e2e/), what CI runs on 8.3.6 and, informationally, :latest
SCREENSHOTS=1 npx playwright test screenshots   # (in e2e/) regenerate docs/images
python3 ops/verify/tools/build_views.py         # regenerate the verify views, then commit the JSON
```

Without `playwright install` (a container with its own Chromium), point the
suite at it: `PW_CHROMIUM_PATH=/path/to/chrome ops/e2e.sh`.

The demo page is `http://localhost:9388/data/perspective/client/verify`;
`/test/<mode>/<timeoutSec>[/<wakePriority>]` picks the guard's config (the
e2e suite uses those). The guard lives in the shared top dock (`GuardDock`),
bound to `session.custom.guard`, which the page's view sets from its URL.

What the e2e suite proves, on a real 8.3.6 gateway:

- idle after the timeout, wake on movement beyond the jitter threshold, page
  state intact;
- a waking mouse press/release and a waking key press never reach the page
  (the mouse and key tests fail when the swallowing is disabled; the touch test
  cannot, because Chromium already drops a tap whose target vanished);
- a High alarm wakes the page within the poll budget and keeps it awake;
- a Medium alarm pins a banner without waking;
- Critical wakes even with `wakePriority` Critical, and is never covered;
- a silent feed (the suite drops its WebSocket messages) makes the guard fail
  open and stay away until the feed returns;
- starfield and pipes draw; external mode draws nothing but reports idle;
- the browser console stays clean throughout.
