# Market fit: Mustry Screensaver

Research date: 2026-10-10. Ignition facts are checked against the 8.3 manual. The
8.3 SDK javadoc is published up to 8.3.7
([AuthChallengeCompleteEvent, 8.3.7](https://sdk.inductiveautomation.com/javadoc/ignition83/8.3.7/com/inductiveautomation/perspective/gateway/api/AuthChallengeCompleteEvent.html)).
Anything not verified is marked **assumption**.

## 1. Problem and evidence

Perspective runs on many screens nobody touches for hours: control-room walls,
shop-floor TVs, line-side panels, shared operator PCs. Four problems come up
again and again.

**1. Perspective has no idle hook for the page itself.**
- Vision has `system.util.getInactivitySeconds()`. IA confirmed in 2019 that it
  does not work in Perspective. IA also said "there's no way in Ignition to run
  arbitrary code on the browser frontend", and that a custom module is the only
  way to do it ([forum, 2019–2021](https://forum.inductiveautomation.com/t/feature-13751-perspective-auto-logout/24416)).
- Perspective has had a project-level Inactivity Timeout since 8.0.16. It can do
  two things: log out or close the session. The gateway keeps the time, and
  "activity" means opening a tab, clicking or typing, or a tap or swipe on mobile
  ([8.3 project properties](https://docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-project-properties)).
  Mouse movement does not count. It cannot show a different view.
- `session.props.lastActivity` came in 8.1.8
  ([8.3 session properties](https://docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-sessions/session-properties)).
  In January 2026 users reported that on 8.3 it stays null and that "activity"
  roughly means "a tab is open". An IA engineer said a fix was unlikely in 8.3.4
  or 8.3.5 ([Automatic Inactivity Detection, 2026](https://forum.inductiveautomation.com/t/automatic-inactivity-detection/113196)).
- Integrators keep building this by hand. Examples:
  [run a script after inactivity](https://forum.inductiveautomation.com/t/perspective-run-script-after-inactivity-timer-elapses/43865)
  (2,571 views),
  [application timeout script](https://forum.inductiveautomation.com/t/how-to-add-application-timeout-script-in-perspective/61501)
  (1,518 views),
  [inactive logout only for some roles](https://forum.inductiveautomation.com/t/perspective-inactive-logout-for-specific-roles/77187)
  (1,127 views), and
  [auto log-out](https://forum.inductiveautomation.com/t/auto-log-out-in-perspective/101615)
  (2025, where the workaround is an `onMouseMove` script on every view root).

**2. Perspective cannot lock a screen.**
- Vision has `system.security.lockScreen()`. Perspective does not have it
  ([Lock Screen Perspective, 603 views](https://forum.inductiveautomation.com/t/lock-screen-perspective/28532)).
- "Perspective cannot programmatically switch users… Logout is the only
  downgrade operation possible"
  ([2025](https://forum.inductiveautomation.com/t/session-inactivity-in-ignition-perspective-edge-automatic-permission-downgrade/109975)).
- `system.perspective.logout()` restarts the whole session. An ideas-portal
  request to stop that has
  [7 votes](https://ideas.inductiveautomation.com/ignition-features-and-ideas/p/systemperspectivelogout-login-add-option-to-not-restart-session).

**3. Rotating dashboards on TVs is DIY.**
- [Rotating Status Display](https://forum.inductiveautomation.com/t/rotating-status-display/37959)
  (1,572 views): one integrator found a Chrome tab-rotator extension
  "light years ahead" of rotating views in Perspective, which reloaded each view.
- Other threads:
  [Carousel cycle endlessly](https://forum.inductiveautomation.com/t/question-can-the-carousel-component-cycle-through-views-endlessly/20898)
  (1,122 views),
  [cycle views every minute](https://forum.inductiveautomation.com/t/cycle-through-different-perspective-views-every-minute/74654)
  (799 views), an
  [`now()` expression trick for tab rotation](https://forum.inductiveautomation.com/t/autorotate-through-tabs-on-a-tabcontainer/88757),
  and an open idea for [Carousel wraparound](https://ideas.inductiveautomation.com/ignition-features-and-ideas/p/perspective-carousel-wraparound)
  (4 votes).
- The kiosk hardware guides are popular:
  [Custom Perspective Kiosk on Linux](https://forum.inductiveautomation.com/t/building-a-custom-perspective-kiosk-on-linux-hardware/79551)
  has 5,949 views, 52 posts and 79 likes.
- TV dashboards fight sleep policies. One
  [2025 thread](https://forum.inductiveautomation.com/t/preventing-sleep-mode-in-a-display-only-ignition-project/102862)
  ends with USB mouse jigglers and a VBScript that presses F13. Nobody mentions
  the browser Screen Wake Lock API. That API has been Baseline since March 2025,
  but it needs HTTPS ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock)).

**4. 24/7 static screens wear out, and warranties exclude it.**
- Philips: "Always activate a periodic screen refresh application if your LCD
  monitor will display unchanging static content". Burn-in damage is not covered
  ([Philips](https://www.usa.philips.com/c-f/XC000007486/what-is-image-sticking-image-burn-in-an-after-image-or-a-ghost-image-on-an-lcd)).
- Sharp/NEC exclude image retention from fixed images. NEC's 24/7 extension
  requires brightness at 70 % or lower
  ([NEC 24/7 guidelines](https://assets.sharpnecdisplays.us/documents/miscellaneous/24-7_operationalguidelines.pdf),
  [Sharp warranty](https://assets.sharpnecdisplays.us/documents/limitedwarranty/4t-b_series_warranty.pdf)).
- Elo recommends screen savers
  ([Elo](https://elosupport.elotouch.com/hc/en-us/articles/31649153469719-What-can-be-done-about-image-burn-in)).
- OLED is more at risk. Vendors recommend pixel shift
  ([Samsung](https://www.samsung.com/ca/support/displays/how-to-troubleshoot-burnin-or-image-retention-on-your-samsung-oled-monitor/)).
- An ISA-101 Level 1 overview is meant to be a large, non-interactive, always-on
  screen ([IFE/Sintef slides](https://www.sintef.no/globalassets/project/hfc/documents/04-nimmo-ife-norway-2018-final-25th-2-pgs.pdf),
  [Emerson](https://s1-live.emerson.com/documents/automation/whitepaper-efficient-operations-using-advanced-operator-graphics-en-5091646.pdf)).
  That is exactly the static image that burns in.

**The security and safety tension.**
- IEC 62443-3-3 SR 2.5 asks for session lock after a configurable idle time. A
  secondary source says this is balanced against operational safety for
  monitoring HMIs ([transcription](https://compliance.theartofservice.com/controls/iec-62443/62443-3-3-fr2-sr-2-5);
  we did not check the paywalled text).
- NIST's OT overlay for AC-11 lets you tailor device lock where operators must
  respond immediately. It also says a device lock is "not an acceptable
  substitute for logging out" ([csf.tools, AC-11](https://csf.tools/reference/nist-sp-800-53/r5/ac/ac-11/)).
- So a screen saver in a control room has to lock without hiding alarms.
  Windows screen savers and GPO locks don't do that. **Assumption:** this is why
  many control-room PCs have the OS lock turned off.

**Other HMI platforms ship this.**
- FactoryTalk Optix has an idle-timeout screen saver and auto-logout template
  ([Rockwell docs](https://www.rockwellautomation.com/en-us/docs/factorytalk-optix/current/contents-ditamap/creating-projects/sessions-and-locales/configure-idle-timeout/configure-a-screen-saver-or-automatic-logout.html)).
- C-more has a screen-saver object
  ([AutomationDirect](https://cdn.automationdirect.com/static/helpfiles/c-more/cm5/Content/023.html)).
- Siemens panels have screen saver and backlight settings
  ([Siemens forum](https://support.industry.siemens.com/forum/br/en/post/276183)).
- Integrators coming from those platforms expect the feature in Perspective.

**How strong is the demand?** Honestly, moderate.
- Forum threads add up to a few thousand views each, spread over seven years.
- No ideas-portal entry for "Perspective screensaver" turned up. Canny search is
  client-side and we could not query it, so this is unverified.
- This is a chronic annoyance, not a burning pain. It is far smaller than Designer
  Dark Mode, which was the most-requested idea on the portal.

## 2. Target buyers and users

- **Integrators** (Mustry's peers and the HMI Kit audience). They build shop-floor
  TV dashboards and control-room walls on every second project and rebuild the
  idle and rotation logic each time. They choose what goes on the gateway.
- **Plant OT / engineering teams** running Perspective on 24/7 wall displays.
  They care about burn-in, display warranties and "the TV went to sleep again".
- **Security and IT** on shared operator stations. They want a lock that passes
  an audit without hiding alarms.
- **Operators and line leads** are the users. They look at the Andon board from
  ten metres away and touch the screen to wake it.
- **Marketing audience.** The same Ignition community that shared Mustry Doom.

## 3. Existing alternatives and competitors

| Name | What it does | Price | Gap |
|---|---|---|---|
| Perspective Inactivity Timeout ([docs](https://docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-project-properties)) | Logs out or closes the session after N minutes; grace-period message | Included in Perspective | No idle view; ignores mouse movement; logout only; one setting per project |
| `session.props.lastActivity` + scripts | DIY idle logic in change scripts | Free (integrator time) | Server-timed, click/type only, reported null on 8.3; per-project copy-paste |
| Perspective Carousel autoplay ([docs](https://docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-embedding-palette/perspective-carousel.md)) | Rotates views on a timer | Included | Not idle-triggered, no alarm interrupt, no burn-in care |
| Vision `getInactivitySeconds` / `lockScreen` | Idle detection and screen lock | Included (Vision) | Vision only |
| Perspective Workstation kiosk ([docs](https://docs.inductiveautomation.com/docs/8.3/launchers-and-workstation/perspective-workstation.md)) | Full-screen locked-down shell | Included | No idle behaviour at all |
| Chrome kiosk + tab-rotator extensions, Linux kiosk builds | Rotate tabs on a TV | Free | No alarm awareness; unmanaged extensions on OT PCs; one tab per view costs RAM ([16 tabs → black screens](https://forum.inductiveautomation.com/t/intermittent-black-blank-screen-when-returning-to-perspective-hmi-tabs/112237)) |
| OS screen saver / GPO lock, mouse jigglers | Lock or keep the PC awake | Free | Hides alarms, or defeats security |
| Peakboard ([pricing](https://www.peakboard.com/en/pricing)) | Andon / shop-floor boards with OPC UA, MQTT, S7 | €49–89 per board per month (EU page); US page from $1,400–2,000/yr | Separate platform and data integration; not inside Ignition |
| Digital signage SaaS: Yodeck, Rise Vision, ScreenCloud ([Rise Vision comparison](https://www.risevision.com/blog/yodeck-alternatives/)) | Cloud playlists on TVs | About $8–24 per screen per month (vendor-written comparison) | Cloud, no tag or alarm data, not OT-grade |
| Sepasoft OEE / MES ([case study](https://www.dmcinfo.com/our-work/using-sepasoft-to-track-cnc-machine-oee/)) | OEE and downtime data and screens | Quote | Produces the KPIs; idle and rotation are not its job. A complement |
| Ignition Exchange | No screensaver, idle or Andon-rotation resource found | Free | **Assumption:** we could not query the Exchange catalogue directly |
| FactoryTalk Optix, C-more, Siemens panels | Native screen saver or idle timeout | Part of those HMIs | Not Ignition. Shows what users expect |

Nobody ships an Ignition-native, alarm-aware idle mode with burn-in care. The
gap is real but narrow. A good integrator can fake about 60 % of it in a day with
Carousel, a popup and `lastActivity`.

## 4. Why Mustry

- **Same machinery as Mustry Doom.** A React/TS Perspective component, a
  `ComponentStoreDelegate`/`ComponentModelDelegate` pair, a gateway hook and
  start-gating lessons. Doom already does "alarm pauses the game". This is the
  same idea turned around: the alarm wakes the screen.
- **Mustry HMI Kit upsell.** "Flight over the P&ID" drives the PidCanvas
  `view.zoom`/`view.center` props. It only works when the licensed HMI Kit is
  installed. The free module becomes a demo for the paid one.
- **Alarm Notifications and Observability.** Wake events, lock and unlock
  events, and display uptime can go to the audit trail and the Prometheus
  endpoint.
- **ISA-101 credibility** from the HMI Kit work. The Andon board can use the
  same token set and grey-scale state scheme.
- **The marketing playbook is proven.** Doom and Designer Dark Mode got
  attention because they were free and a bit cheeky.

## 5. Pricing and licensing

**Recommendation: free core module, `freeModule=true`.** The HMI Kit fly-through
acts as the paid hook. Consider a paid "Display Manager" later, only if demand
shows up.

- **Why free.** The serious features each replace a day of DIY work. DIY is the
  real competitor, and it costs nothing.
  - For comparison, IA list prices (April 2023) are Perspective Unlimited
    $11,225, WebDev $1,890 and the Web Browser module $650
    ([IA pricing update](https://page.inductiveautomation.com/pricing-updates-2023)).
  - **Assumption:** a third-party idle module would have to sit well under the
    $650 Web Browser module. €200–400 per gateway is too little revenue to
    justify licensing, support and the LicenseGate plumbing.
  - As a free module it earns attention, leads and HMI Kit trials.
- **A paid variant that could work later.** A "Display Manager":
  - every wall screen and TV registered on the gateway, with central schedules,
    remote wake, blank and reload
  - fleet health (which TV is dead or asleep)
  - audit of lock and unlock events
  - per-display config in the gateway web UI

  That competes with Peakboard and signage SaaS at €49–89 or $8–24 per screen per
  month. A per-gateway price of about €900–1,500/yr (**assumption**) would
  undercut ten screens of Peakboard. Build it only if the free module gets
  asked for it.
- **Licence of the code.** No GPL constraint, because no GPL engine is
  involved. Free closed-source is fine. Open source would help adoption but
  exposes the HMI Kit integration surface. Open question for Sam.

## 6. Risks

| Risk | Likelihood | Impact | Note |
|---|---|---|---|
| **IA ships it natively** (fixes `lastActivity`, adds an idle event or a Perspective `lockScreen`) | Medium over 2–3 years | High for the idle and lock part, low for the modes | IA added inactivity in 8.0.16, `lastActivity` in 8.1.8 and the auth challenge in 8.1.16. An IA engineer said 8.3.4/8.3.5 were already full (Jan 2026). Keep the fun and Andon modes as the durable value |
| Someone sells the lock as a security control and an auditor disagrees | Medium | Reputation | A browser overlay is not a security boundary. Say so in the docs; real access control stays with logout |
| Overlay hides an alarm, or an unattended "wake" misses one | Low | Severe (safety) | Never hide priority ≥ threshold; fail open; test this in e2e |
| Module JS is not loaded on pages that don't contain its component | Medium | Medium | Spike 1 in the spec; fallback is one component in a docked view |
| Demand is too thin for anyone to notice | Medium | Low (it is cheap) | The fun-mode GIF is the marketing; the Andon board is the utility |
| IP in the fun modes | Low if careful | Medium | After Dark's flying toasters were enforced in court (the Delrina recall, [Seattle Times 1993](https://archive.seattletimes.com/archive/19931014/1726015/opus-screen-saver-recalled)). Use original sprites; don't name it "3D Pipes" |
| Plain-HTTP gateways block the Wake Lock API | High | Low | Document it; Workstation and kiosk settings cover the rest |

## 7. Verdict: **Go with changes**

| Dimension | Score /10 | Why |
|---|---|---|
| Demand | 5 | A steady trickle of forum threads over seven years; no large vote count |
| Differentiation | 7 | No Ignition-native product found; parity gap with Vision, Optix and C-more |
| Feasibility | 7 | Mostly browser work the Doom module already proved; three spikes needed |
| Fit | 8 | Reuses the Doom patterns, sells the HMI Kit, matches the free-module playbook |
| **Overall** | **6.5** | |

The changes:

1. **Ship it free.** It is a marketing piece with real utility. Don't make it a
   standalone paid product.
2. **Lead with alarm-aware idle and burn-in protection, not the lock.** Present
   the lock as a privacy screen plus re-authentication. Never present it as an
   IEC 62443 control.
3. **Make the P&ID fly-through HMI Kit-only.** That is the commercial reason to
   build it.
4. **Keep the MVP small:** about 7.5 person-weeks (see the spec). Revisit a
   paid "Display Manager" only on demand.
