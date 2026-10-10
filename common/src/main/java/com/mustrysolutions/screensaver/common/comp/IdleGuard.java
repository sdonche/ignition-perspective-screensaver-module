package com.mustrysolutions.screensaver.common.comp;

import static com.mustrysolutions.screensaver.common.MustryScreensaverModule.descriptor;
import static com.mustrysolutions.screensaver.common.MustryScreensaverModule.event;

import java.util.List;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;

/**
 * Describes the Idle Guard: one per page (put it in a shared dock), it watches
 * pointer, touch, key and wheel input in the browser and, after a timeout,
 * covers the page with an idle mode. Any input wakes it, and so does an alarm
 * at or above the wake priority. An active Critical alarm is never covered.
 *
 * <p>The {@link #COMPONENT_ID} here MUST exactly match the {@code COMPONENT_TYPE}
 * declared in web/typescript/components/guard/IdleGuard.tsx.
 */
public final class IdleGuard {

    private IdleGuard() {
    }

    public static final String COMPONENT_ID = "mustrysolutions.perspective.screensaver.idleguard";

    public static final ComponentDescriptor DESCRIPTOR = descriptor(
        COMPONENT_ID, "Idle Guard", "IdleGuard",
        "Screensaver for Perspective. After config.timeoutSec without input the page shows an idle mode (clock, starfield, pipes, blank); any touch, key or mouse movement wakes it, and so does an alarm. Put one in a shared dock.",
        "/idleguard.props.json",
        List.of(
            event("onIdle",
                "Fires when the page goes idle. Payload: { mode, idleSince }.",
                "/idleguard.onidle.event.json"),
            event("onWake",
                "Fires when the page wakes. Payload: { cause, idleForMs } where cause is 'input', 'alarm', 'feed-stale' or 'disabled'.",
                "/idleguard.onwake.event.json")));
}
