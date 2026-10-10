# Product spec: Mustry Screensaver

Target: Ignition 8.3.6+ (JDK 17). Perspective only. Scopes: Gateway and Designer,
plus a browser bundle. Built the same way as the sibling modules: Gradle with
`io.ia.sdk.modl`, a React/TypeScript strict web bundle, and Java hooks.
Evidence and pricing are in [market-fit.md](market-fit.md).

> **Build status:** v0.1 is built: the Idle Guard, its alarm policy, the
> pipes, aurora, halo and starfield modes (WebGL2, with 2D fallbacks), the
> clock, blank and external modes, and night dimming. The
> Andon board, rotation, privacy lock and page orbit are deferred. What
> changed from this spec and why: [reference.md](reference.md#differences-from-the-spec).

## 1. User stories

**Plant engineer, 24/7 control-room wall**
- After 10 minutes without input, the overview page switches to a slowly
  drifting Andon board. The static overview does not burn into the panel.
- Between 22:00 and 06:00 the wall dims to 40 %, or goes blank, unless there is
  an active alarm.

**Operator**
- One touch, key press or mouse movement brings back the exact page I left,
  with its state intact.
- When a high-priority alarm goes active while the screen is idle, the screen
  wakes, or at least shows the alarm, before anything else.
- I never have to wonder whether the screen saver is hiding a critical alarm.

**Integrator**
- I drop one component into a docked view, bind its timeout to a session or
  role expression, and every page in the project gets idle behaviour. No script
  on every view root.
- I list five views with dwell times and get a TV rotation that pauses on alarm
  and does not reload views on each switch.
- The component's `onIdle`/`onWake` events and bindable `output.idle` let me
  drive my own logic: navigate, open a popup, write a tag.

**Security officer, shared operator station**
- After N minutes idle, the page covers itself with a lock screen. Unlocking
  requires re-authentication.
- A locked screen still shows that an alarm is active, without showing process
  detail.
- Lock and unlock events are logged.

**Marketing / community**
- A demo project where the "Pipes" mode draws the plant's real pipes, coloured
  by live state, and a 10-second GIF that spreads the way Mustry Doom did.

## 2. Scope

### MVP (v1.0)

1. **Idle Guard component** (`mustry.idle.guard`)
   - **Idle detection.** Browser listeners on `pointermove` (with a jitter
     threshold), `pointerdown`, `keydown`, `wheel`, `touchstart` and
     `visibilitychange`.
   - **Config.**
     - Timeout per instance, bindable, so it can vary by page, role or display.
     - `wakeOn` options.
     - Disabled in the Designer.
   - **Outputs.**
     - `output.idle`, `idleSince`, `lastInput`, `locked`, `mode`.
     - Component events `onIdle`, `onWake`, `onLock`, `onUnlock`.
   - **Overlay.** Renders the idle mode as a full-viewport layer above the
     page. The page underneath stays mounted, so waking costs no reload.
   - **Popup path.** For integrators who prefer their own view, an `external`
     mode only emits events. The project opens or closes a full-screen popup,
     or navigates.
   - **Screen Wake Lock** (`navigator.wakeLock`) is optional. It only works on
     HTTPS.

2. **Idle modes**
   - **Andon** uses the Andon Board component below.
   - **Rotation:**
     - a list of `{view, params, dwellSec}`
     - views are embedded and kept mounted, so they don't reload
     - pauses on alarm
   - **Starfield.** Star speed and colour are bound to any two values, such as
     line rate and state.
   - **Pipes.** A 3D pipe-growth animation. Each pipe is bound to a tag path:
     colour comes from its state, speed from its flow. It is our own
     implementation; we don't copy the Windows screensaver.
   - **Blank** for night mode. A **Clock** mode shows a large clock, the shift
     name and the alarm count.

3. **Alarm policy.** It is enforced in the browser and fed by the gateway.
   - **Active alarms.** The gateway delegate subscribes to alarms matching the
     configured source filter. It pushes counts by priority and the top N
     active alarms, unacknowledged first.
   - **`alarm.wakePriority`** (default High): any active alarm at or above it
     dismisses the overlay.
   - **`alarm.pinPriority`** (default Medium): the overlay shows a pinned banner
     with the counts.
   - **Critical can never be hidden.** Critical is always at or above
     `wakePriority`. The schema enforces it, and so does the code.
   - **Fail open.** If the gateway alarm feed is stale for more than 2× its
     interval, or the websocket drops, the overlay removes itself.

4. **Burn-in protection**
   - **Idle modes** use slow pixel orbit and drifting tile positions.
   - **Opt-in page orbit** (`burnIn.orbitPage`). While the page is in normal
     use, the whole Perspective root moves a few px every few minutes. This is
     for always-on Level 1 overviews.
   - **Dim schedule.** A CSS dimming layer runs on a time window. The schedule
     is lifted while any alarm at or above `pinPriority` is active.

5. **Andon Board component** (`mustry.idle.andon`). It is also usable as a
   normal view.
   - **Tiles:** label, value, unit, target and state. Each is bound by the
     integrator.
   - **Line-state strip:** running, idle, fault or changeover.
   - **Alarm counts by priority** come from the gateway with no bindings.
   - **Clock and shift.**
   - **Layout** is designed to be read from 10 m.
   - **Colours** follow ISA-101 (grey normal, colour only for abnormal) and
     reuse the HMI Kit `--mhk-*` token values.

6. **Privacy lock (convenience)**
   - After `lock.afterSec`, the overlay switches to a lock screen. It shows no
     process data, only alarm counts and the clock.
   - Unlock runs Perspective's authentication challenge, which leaves the
     session's auth state unchanged
     ([8.3 docs](https://docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-perspective/system-perspective-authenticationChallenge),
     [IA announcement](https://forum.inductiveautomation.com/t/new-authentication-challenge-feature-in-perspective/57182)).
     The overlay clears only if the challenged user is the session user, or has
     a configured role.
   - Lock and unlock are logged on the gateway.
   - Documented plainly: this is a privacy screen. For access control, also
     enable the project's Inactivity Timeout (Logout) with a longer timer.

7. **Verify project and e2e.** A demo project in the style of the Doom control
   room, and a Playwright suite on a dockerised 8.3.6 gateway (see §6).

### Later

- **v1.1, `[Screensaver]` tag provider.** One folder per display: `Idle`,
  `Locked`, `LastInput`, `Mode`, `Online`. Fleet health becomes plain tags you
  can historise and alarm on. This copies the Doom `DoomTagProvider` pattern.
- **v1.1, P&ID flight.** Built in the HMI Kit, not here. It adds a `view.tour`
  prop to the PidCanvas (`waypoints: auto | [nodeIds]`, `dwellSec`, `easing`).
  The tour animates `view.center` and `view.zoom` and slows at nodes in alarm.
  The screensaver's `pidFlight` mode embeds a view holding a PidCanvas with
  `tour.enabled` bound to `output.idle`. It needs the licensed HMI Kit.
- **v1.2.** Scripting: `system.screensaver.wake(sessionId)`, `lock(...)` and
  `status()`. Prometheus counters through Mustry Observability. Audit
  forwarding through Mustry Alarm Notifications.
- **Possible paid "Display Manager".** Display registry, central schedules,
  remote wake/blank/reload, and per-display config in the gateway web UI. Only
  if the free module creates the demand.

### Non-goals

- **No OS-level lock, display power (DPMS/HDMI-CEC) or keep-awake.** The module
  stops at the browser. We document the Workstation, kiosk and OS settings
  instead.
- **No security-control claims.** We do not claim IEC 62443 SR 2.5 or NIST
  AC-11 compliance. An overlay in a browser can be removed with dev tools.
- **No Vision support.** Vision already has `getInactivitySeconds` and
  `lockScreen`.
- **No general digital signage:** no media playlists, video scheduling, ads or
  cloud management.
- **No PIN or badge authentication of our own in v1.** Authentication stays with
  Ignition's IdPs.
- **No copies of trademarked screensavers:** no After Dark toasters, and the
  name "3D Pipes" is not used.

## 3. Architecture on Ignition 8.3

```
Browser (Perspective client)                          Gateway
┌───────────────────────────────────────┐            ┌──────────────────────────────────┐
│ IdleGuard (React class component)     │  store/    │ GuardModelDelegate (per instance) │
│  idle state machine (pure, jest)      │◄─model────►│  alarm subscription + filter      │
│  overlay portal → mode renderer       │  delegate  │  lock/unlock audit log            │
│  alarm policy (pure) + fail-open      │  events    │ ScreensaverGatewayHook            │
│  burn-in orbit / dim schedule         │            │  ComponentRegistry (components)   │
│ AndonBoard component                  │            │  ComponentModelDelegateRegistry   │
│ Modes: starfield (2D canvas),         │            │  /res/mustry-screensaver/* bundle │
│        pipes (WebGL), rotation        │            └──────────────────────────────────┘
└───────────────────────────────────────┘            Designer hook: palette entries
```

**Scopes**
- **common:** component descriptors and the `*.props.json` schemas.
- **gateway:** hook, resource mount, delegates, alarm listener, audit.
- **designer:** palette.
- **web:** bundled into the gateway scope, as in the Doom and HMI Kit modules.
- Depends on Perspective. `freeModule=true`.

**SDK extension points**
- `PerspectiveContext.getComponentRegistry()` registers the components, with
  `BrowserResource` JS and CSS under `/res/mustry-screensaver/`.
- `getComponentModelDelegateRegistry()` registers a delegate per component id.
  The browser side is a `ComponentStoreDelegate`, the same event pair Doom uses
  for saves and telemetry: `idle-alarms` (push), `idle-lock-audit`,
  `idle-config-ack`.
- The gateway alarm API (`GatewayContext.getAlarmManager()`) provides status
  queries and a listener for state changes. Each delegate filters by source
  path and priority. The first query happens on startup, and it is pushed
  again on every change with a heartbeat. The heartbeat is what lets the
  browser fail open.
- Unlock uses the Perspective "Authentication Challenge" event action or
  `system.perspective.authenticationChallenge`. The result arrives in the
  project's `onAuthenticationChallengeCompleted` session event, or through
  `AuthChallengeCompleteEvent` in the gateway API (spike 3).
- Optional `WebResourceManager` routes are not needed for the MVP.

**Data storage**
- **MVP:** none. All config is component props, bindable per page, session or
  role. The audit goes to the gateway log (logger `mustry.screensaver.audit`).
- **v1.1:** a `ManagedTagProvider` for display state. A paid Display Manager
  would add 8.3 file-based config resources and a gateway web page.

**Design rules carried over from the siblings**
- React class components.
- The guard must render nothing visible in its host container. Everything
  visible goes into a portal attached to `document.body`.
- Apply the Doom start-gating lesson: don't start idle timers on the first
  render of a reused component store. Wait for bindings to settle.

## 4. Technical risks and spikes to run first

1. **Global presence (2 days).**
   - Find out whether a module's `BrowserResource`s load in every session, or
     only on pages containing one of its components.
   - Confirm that a guard in a docked view, which is shown on every page,
     survives navigation without remounting.
   - Fallback: document "put the guard in a docked view". This decides how
     zero-config the module can be.
2. **Overlay stacking (1 day).**
   - A `document.body` portal with `position: fixed` must sit above
     Perspective popups, docks and the "disconnected" banner, without
     breaking keyboard focus or touch scrolling when it is removed.
   - Embedding Perspective views inside our portal (the rotation mode) needs
     the SDK's view-embedding API. Without it, rotation falls back to the
     popup path.
3. **Re-auth without session restart (2 days).**
   - Confirm that an authentication challenge started from a component works
     with the internal IdP and with OIDC/SAML.
   - Confirm that `forceAuth` really prompts.
   - Confirm that the module can see the challenge result in Java, without
     the integrator adding a session-event script.
   - Fallback: ship a one-line session-event snippet.
4. **Alarm feed (1 day).**
   - Check the 8.3 alarm listener API and the cost per delegate with 50 idle
     displays.
   - Test filtering by source path and display path.
   - Measure the latency from alarm active to overlay dismissed. Target < 2 s.
5. **Page orbit side effects (1 day).** Transforming the Perspective root can
   break `position: fixed` children, popups and coordinate-container
   hit-testing. Test it on the HMI Kit gallery.
6. **Pipes performance (1 day).** WebGL on low-end kiosk hardware (Raspberry Pi
   4 / WPE WebKit, Intel NUC). Keep a 2D fallback, a frame cap of 30 fps, and
   stop rendering when the tab is hidden.

## 5. Effort estimate (MVP)

| Work | Person-weeks |
|---|---|
| Spikes 1–6 | 1.0 |
| Module skeleton (copy Doom/HMI Kit build), descriptors, palette | 0.5 |
| Idle Guard: state machine, overlay portal, events, wake lock, Designer inertness | 1.0 |
| Alarm delegate, policy, fail-open | 1.0 |
| Burn-in: orbit, drift, dim schedule | 0.5 |
| Andon Board component | 1.0 |
| Modes: rotation, starfield, pipes, clock, blank | 1.0 |
| Privacy lock and challenge integration | 0.5 |
| Verify project, Playwright e2e (idle, wake, alarm-wake, critical-never-hidden, rotation, lock), docs, demo GIF | 1.0 |
| **Total** | **≈ 7.5** |

For one developer who knows the Doom and HMI Kit code, that is roughly two
calendar months alongside other work. Not included: the HMI Kit `view.tour`
(about 1–1.5 weeks in that repo) and the v1.1 tag provider (about 0.5 weeks,
pattern exists).

## 6. Tests that must exist

- **jest:**
  - idle state machine (timeouts, jitter threshold, visibility)
  - alarm policy (wake, pin, critical invariant, fail-open on stale feed)
  - rotation scheduler and dim schedule
- **JUnit:** alarm filter and priority mapping, audit formatting.
- **Playwright** on 8.3.6, reusing the Doom `ops/` scripts:
  - the page idles after 5 s, wakes on mouse move, and the same page state is
    still there
  - writing a tag raises a High alarm, and the overlay disappears within 2 s
  - a Critical alarm is never covered, whatever the config
  - rotation does not reload views
  - the lock unlocks with the internal IdP
  - the browser console is clean

## 7. Open questions for Sam

1. **Name.** "Mustry Screensaver" is plain. Alternatives: "Night Shift",
   "Idle Hands", "Lights Out". Avoid "After Dark" (Berkeley Systems'
   trademark).
2. **Licence.** Free and closed, or free and open source? It can be
   non-GPL, since no GPL engine is involved.
3. **8.1.** Should it get an 8.1 build like the HMI Kit (D6)? 8.1 has
   `lastActivity` and the auth challenge, so it is technically possible.
4. **Lock.** Is the privacy lock in v1.0, or does it wait until spike 3 shows a
   script-free unlock?
5. **Fly-through.** Agree that it lives in the HMI Kit as `view.tour`, so the
   commercial value lands in the paid module?
6. **Andon tokens.** Should the Andon board reuse the HMI Kit's tokens and
   state scheme directly, as a soft dependency, or carry its own copy?
7. **Paid Display Manager.** Is there appetite for it if the free module gets
   traction, or does this stay a pure marketing piece?
8. **Demo project.** Should it run on the same gateway and historian setup as
   the Doom demo, so one stand can show both at a trade fair?
