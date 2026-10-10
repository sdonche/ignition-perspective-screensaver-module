# Mustry Screensaver (working name)

**The 3D pipes screensaver, except they're your actual pipes.**

An Ignition 8.3 Perspective module for screens nobody is touching. After a
configurable idle time a Perspective page switches to something useful (a live
plant overview or Andon board, a dashboard rotation) or something fun (a
starfield running at line speed, pipes drawn from your real tags, a slow flight
over your P&ID). Any touch, key or mouse movement wakes the page at once. So
does an alarm. It never covers an active critical alarm.

The serious part is the reason to install it. Vision has
`system.util.getInactivitySeconds()` and `system.security.lockScreen()`.
Perspective has neither. Its built-in inactivity timeout only logs out or closes
the session, and it ignores mouse movement. This module closes that gap. It also
moves the pixels on 24/7 displays so the overview doesn't burn in.

**Who it is for:** Ignition integrators and plant engineers who run Perspective
on control-room walls, shop-floor TVs, line-side panels and shared operator
stations.

## Headline capabilities

1. **Real idle detection in the browser.** Pointer, touch, key, wheel and tab
   visibility, per page, with idle state written to bindable props. Different
   timeouts per page, role or display, set by binding.
2. **Idle modes.** A live Andon / plant overview board (KPIs, OEE, alarm counts
   by priority, line states from tags), a timed rotation of your own views, and
   fun modes: Starfield, Pipes, Flight over the P&ID (needs the Mustry HMI Kit).
3. **Alarm-aware.** An alarm at or above a chosen priority wakes the screen or
   pins a banner over the idle mode. An active critical alarm is never hidden.
4. **Burn-in protection for 24/7 screens.** Slow pixel orbit, drifting layouts,
   scheduled dimming and a blank "night" mode.
5. **Privacy lock with re-authentication.** Covers the page after a timeout and
   unlocks with Perspective's own authentication challenge, without restarting
   the session. It is a convenience lock, not a security boundary. Real access
   control stays with Perspective's inactivity logout (see the spec).

**Status:** Idea / research stage. No code yet.

- [docs/market-fit.md](docs/market-fit.md): problem, evidence, competitors,
  pricing, risks, verdict
- [docs/product-spec.md](docs/product-spec.md): user stories, MVP scope,
  architecture on Ignition 8.3, spikes, effort, open questions

Made by Mustry Solutions, Ypres, Belgium. It is a sibling of Mustry Doom and
is planned as a free module.
