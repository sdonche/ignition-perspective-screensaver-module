#!/usr/bin/env python3
"""Generates the verify project's Perspective views and page config.

    python3 ops/verify/tools/build_views.py

Writes ops/verify/project/com.inductiveautomation.perspective/{views,page-config}.
Commit the JSON it produces; edit this file, not the JSON.

Layout:
- GuardDock: the shared top dock on every page. Holds the Idle Guard (what an
  integrator would do) and a header bar. The guard's timeout, mode and wake
  priority are bound to session.custom.guard, which the page's view sets from
  its URL, so the e2e suite can pick them per test.
- Overview: a pretend plant overview with a button that counts presses (the
  "a waking tap must not reach the page" check), buttons that raise alarms
  after a delay (so the page can go idle first), and line-rate/state buttons
  that drive the starfield speed and the first pipe's colour.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "project" / "com.inductiveautomation.perspective"
GUARD = "mustrysolutions.perspective.screensaver.idleguard"
FONT = "Inter, 'Segoe UI', system-ui, sans-serif"

BG = "#1f2329"
PANEL = "#2a2f37"
TEXT = "#d7dce4"
MUTED = "#8b95a5"


def write(rel, content, filename):
    folder = ROOT / rel
    folder.mkdir(parents=True, exist_ok=True)
    (folder / filename).write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n")
    res = {"scope": "G", "version": 1, "restricted": False, "overridable": True, "files": [filename], "attributes": {}}
    (folder / "resource.json").write_text(json.dumps(res, indent=2) + "\n")


def expr(expression):
    return {"binding": {"type": "expr", "config": {"expression": expression}}}


def script(body):
    return {"type": "script", "scope": "G", "config": {"script": "\t" + body.replace("\n", "\n\t")}}


def label(name, text, x, y, w, h, style=None, bind=None, dom_id=None):
    c = {
        "type": "ia.display.label",
        "version": 0,
        "meta": {"name": name, **({"domId": dom_id} if dom_id else {})},
        "position": {"x": x, "y": y, "width": w, "height": h},
        "props": {"text": text, "style": {"fontFamily": FONT, "color": TEXT, **(style or {})}},
    }
    if bind:
        c["propConfig"] = {"props.text": expr(bind)}
    return c


def button(name, text, x, y, w, h, on_action, primary=False):
    return {
        "type": "ia.input.button",
        "version": 0,
        "meta": {"name": name},
        "position": {"x": x, "y": y, "width": w, "height": h},
        "props": {
            "text": text,
            "style": {
                "fontFamily": FONT,
                "fontSize": "14px",
                "backgroundColor": "#3b6ea8" if primary else "#3a404a",
                "borderColor": "#4a5160",
                "color": "#ffffff",
            },
        },
        "events": {"component": {"onActionPerformed": script(on_action)}},
    }


def panel(name, x, y, w, h):
    return {
        "type": "ia.display.label",
        "version": 0,
        "meta": {"name": name},
        "position": {"x": x, "y": y, "width": w, "height": h},
        "props": {"text": "", "style": {"backgroundColor": PANEL, "borderRadius": "6px"}},
    }


def tile(prefix, title, x, y, value_expr, unit=""):
    return [
        panel(prefix + "Panel", x, y, 280, 120),
        label(prefix + "Title", title, x + 18, y + 14, 244, 20, {"fontSize": "13px", "color": MUTED, "textTransform": "uppercase", "letterSpacing": "0.08em"}),
        label(prefix + "Value", "", x + 18, y + 42, 244, 48, {"fontSize": "34px", "fontWeight": "300"}, value_expr,
              dom_id="tile-" + prefix.lower()),
        label(prefix + "Unit", unit, x + 18, y + 88, 244, 20, {"fontSize": "13px", "color": MUTED}),
    ]


def guard_dock():
    guard = {
        "type": GUARD,
        "version": 0,
        "meta": {"name": "IdleGuard"},
        "position": {"basis": "220px", "shrink": 0},
        "props": {
            "config": {"timeoutSec": 600, "mode": "pipes"},
            "lines": [
                {"label": "Line 1", "state": "running", "flow": 0.8},
                {"label": "Line 2", "state": "running", "flow": 0.5},
                {"label": "CIP", "state": "idle", "flow": 0.2},
                {"label": "Utilities", "state": "warning", "flow": 0.6},
                {"label": "Palletiser", "state": "running", "flow": 1.1},
            ],
            "modes": {
                "clock": {"title": "Packaging hall · shift B"},
            },
        },
        "propConfig": {
            # Strings from the URL; toInt keeps the number a number.
            "props.config.timeoutSec": expr("toInt(try({session.custom.guard.timeout}, 600), 600)"),
            "props.config.mode": expr("try({session.custom.guard.mode}, 'pipes')"),
            "props.alarm.wakePriority": expr("try({session.custom.guard.wake}, 'High')"),
            "props.config.quality": expr("try({session.custom.guard.quality}, 'auto')"),
            "props.modes.starfield.speed": expr("try(tag('[default]Screensaver/LineRate'), 40) / 40.0"),
            "props.modes.starfield.caption": expr("'Line 1 · ' + numberFormat(try(tag('[default]Screensaver/LineRate'), 0), '0') + ' units/min'"),
            "props.lines[0].state": expr("try(tag('[default]Screensaver/Line1State'), 'running')"),
            "props.lines[0].flow": expr("try(tag('[default]Screensaver/LineRate'), 40) / 50.0"),
        },
        "events": {
            "component": {
                "onIdle": script("self.session.custom.screensaver = {'idle': True, 'mode': event.mode, 'cause': ''}"),
                "onWake": script("self.session.custom.screensaver = {'idle': False, 'mode': '', 'cause': event.cause}"),
            }
        },
    }
    title = {
        "type": "ia.display.label",
        "version": 0,
        "meta": {"name": "Title"},
        "position": {"basis": "320px", "grow": 1},
        "props": {
            "text": "MUSTRY SCREENSAVER · DEMO",
            "style": {"fontFamily": FONT, "color": TEXT, "fontWeight": "700", "letterSpacing": "0.12em", "fontSize": "14px", "paddingLeft": "16px"},
        },
    }
    status = {
        "type": "ia.display.label",
        "version": 0,
        "meta": {"name": "GuardStatus", "domId": "guard-status"},
        "position": {"basis": "560px", "shrink": 0},
        "props": {"style": {"fontFamily": FONT, "color": MUTED, "fontSize": "13px", "textAlign": "right", "paddingRight": "16px"}},
        "propConfig": {
            "props.text": expr(
                "'Idle Guard: ' + try({session.custom.guard.mode}, 'pipes') + ' after ' + "
                "try({session.custom.guard.timeout}, 600) + ' s · last wake: ' + "
                "try(if({session.custom.screensaver.cause} = '', 'none', {session.custom.screensaver.cause}), 'none')"
            )
        },
    }
    return {
        "custom": {},
        "params": {},
        "props": {"defaultSize": {"width": 1280, "height": 44}},
        "root": {
            "type": "ia.container.flex",
            "version": 0,
            "meta": {"name": "root"},
            "props": {"alignItems": "center", "style": {"backgroundColor": "#15181d", "borderBottom": "1px solid #2f3540"}},
            "children": [title, status, guard],
        },
    }


def overview():
    children = [
        label("Heading", "Packaging hall · overview", 32, 24, 700, 40, {"fontSize": "26px", "fontWeight": "600"}),
        label("Sub", "Leave this page alone and the Idle Guard in the header takes over. Touch, click or press a key to wake it.",
              32, 64, 1000, 22, {"fontSize": "14px", "color": MUTED}),
    ]
    children += tile("Rate", "Line 1 rate", 32, 108, "numberFormat(try(tag('[default]Screensaver/LineRate'), 0), '0.0')", "units/min")
    children += tile("State", "Line 1 state", 332, 108, "try(tag('[default]Screensaver/Line1State'), '?')")
    children += tile("Screen", "Screensaver", 632, 108,
                     "try(if({session.custom.screensaver.idle}, 'idle', 'awake'), 'awake')", "from the guard's onIdle / onWake events")
    children += tile("Presses", "Pump start presses", 932, 108, "{view.custom.presses}", "a waking tap must never count here")

    children.append(panel("ActionsPanel", 32, 252, 1180, 400))
    children.append(label("ActionsTitle", "Try it", 52, 266, 400, 24, {"fontSize": "16px", "fontWeight": "600"}))
    children.append(button("Press", "Start pump", 52, 304, 200, 48,
                           "self.view.custom.presses = self.view.custom.presses + 1", primary=True))
    children.append(label("PressHint", "Counts clicks. While the screensaver is up, a tap only wakes the page.",
                          272, 316, 520, 24, {"fontSize": "13px", "color": MUTED}))
    # A control that acts on RELEASE (mouseup / touchend), like a jog or
    # hold-to-run button: the half of a waking gesture a browser can still
    # deliver after the overlay is gone. The e2e suite taps it while idle.
    jog = label("Jog", "Jog (acts on release)", 800, 304, 200, 48,
                {"fontSize": "14px", "fontWeight": "700", "textAlign": "center", "backgroundColor": "#3a404a",
                 "border": "1px solid #4a5160", "borderRadius": "4px", "cursor": "pointer"}, dom_id="jog")
    jog["events"] = {"dom": {
        "onMouseUp": script("self.view.custom.releases = self.view.custom.releases + 1"),
        "onTouchEnd": script("self.view.custom.releases = self.view.custom.releases + 1"),
    }}
    children.append(jog)
    children.append(label("JogCount", "", 1016, 316, 180, 24, {"fontSize": "13px", "color": MUTED},
                          "'releases: ' + {view.custom.releases}", dom_id="jog-count"))

    children.append(label("AlarmTitle", "Raise an alarm in 8 s (time enough to let the page go idle)",
                          52, 376, 900, 24, {"fontSize": "13px", "color": MUTED}))
    x = 52
    for prio, text in (("Medium", "Medium alarm → banner"), ("High", "High alarm → wakes"), ("Critical", "Critical alarm → wakes")):
        children.append(button("Raise" + prio, text, x, 408, 230, 44, "screensaver.raiseLater('%s', 8)" % prio))
        x += 246
    children.append(button("Clear", "Clear all alarms", x, 408, 200, 44, "screensaver.clearAll()"))

    children.append(label("LineTitle", "Drive the idle modes from tags", 52, 480, 600, 24, {"fontSize": "13px", "color": MUTED}))
    x = 52
    for name, text, call in (
        ("RateLow", "Rate 10", "screensaver.setRate(10)"),
        ("RateHigh", "Rate 160", "screensaver.setRate(160)"),
        ("StateRun", "Line 1 running", "screensaver.setState('running')"),
        ("StateFault", "Line 1 fault", "screensaver.setState('fault')"),
    ):
        children.append(button(name, text, x, 512, 180, 44, call))
        x += 196

    return {
        "custom": {"presses": 0, "releases": 0},
        "params": {"mode": "pipes", "timeout": 30, "wake": "High", "quality": "auto"},
        "props": {"defaultSize": {"width": 1280, "height": 680}},
        "propConfig": {
            "custom.presses": {"persistent": True},
            "custom.releases": {"persistent": True},
            "params.mode": {"paramDirection": "input", "persistent": True},
            "params.timeout": {"paramDirection": "input", "persistent": True},
            "params.wake": {"paramDirection": "input", "persistent": True},
            "params.quality": {"paramDirection": "input", "persistent": True},
        },
        "root": {
            "type": "ia.container.coord",
            "version": 0,
            "meta": {"name": "root"},
            "props": {"style": {"backgroundColor": BG}},
            "events": {
                "system": {
                    "onStartup": script(
                        "screensaver.setupTags()\n"
                        "self.session.custom.guard = {'mode': self.view.params.mode, 'timeout': self.view.params.timeout, 'wake': self.view.params.wake, 'quality': self.view.params.quality}\n"
                        "# The guard's onIdle/onWake events overwrite this; set here so bindings never see a missing path.\n"
                        "self.session.custom.screensaver = {'idle': False, 'mode': '', 'cause': ''}"
                    )
                }
            },
            "children": children,
        },
    }


def page_config():
    params = {"mode": "pipes", "timeout": 30, "wake": "High", "quality": "auto"}
    dock = {
        "id": "guard",
        "viewPath": "GuardDock",
        "viewParams": {},
        "size": 44,
        "content": "push",
        "show": "visible",
        "handle": "hide",
        "anchor": "fixed",
        "resizable": False,
        "modal": False,
        "autoBreakpoint": 480,
        "iconUrl": "",
    }
    return {
        "pages": {
            "/": {"viewPath": "Overview", "viewParams": params},
            "/test/:mode/:timeout": {"viewPath": "Overview", "viewParams": params},
            "/test/:mode/:timeout/:wake": {"viewPath": "Overview", "viewParams": params},
            "/test/:mode/:timeout/:wake/:quality": {"viewPath": "Overview", "viewParams": params},
        },
        "sharedDocks": {"top": [dock]},
    }


def main():
    write("views/GuardDock", guard_dock(), "view.json")
    write("views/Overview", overview(), "view.json")
    write("page-config", page_config(), "config.json")
    print("wrote", ROOT)


if __name__ == "__main__":
    main()
