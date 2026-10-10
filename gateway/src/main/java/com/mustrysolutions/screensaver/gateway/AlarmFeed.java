package com.mustrysolutions.screensaver.gateway;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

import com.inductiveautomation.ignition.common.alarming.AlarmEvent;
import com.inductiveautomation.ignition.common.alarming.AlarmFilter;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.alarming.AlarmManager;

/**
 * One alarm poller per gateway, shared by every Idle Guard. Each tick it reads
 * the active alarms once, then gives each subscribed guard its own filtered
 * summary: at once when it changed, otherwise as a heartbeat. The heartbeat is
 * what lets the browser fail open: a guard that hears nothing for
 * {@code alarm.staleAfterSec} removes its idle mode.
 *
 * <p>One query per tick, whatever the number of displays, is the reason this
 * polls instead of registering an {@code AlarmListener} per guard.
 */
public final class AlarmFeed {

    private static final LoggerEx log = LoggerEx.newBuilder().build("MustrySolutions.Screensaver.AlarmFeed");

    /** How often the gateway's alarm status is read. Bounds the alarm-to-wake latency. */
    static final long POLL_MS = 1000;
    /** An unchanged summary is re-sent this often. Must stay well under the browser's staleAfterSec (min 3 s). */
    static final long HEARTBEAT_MS = 2000;

    /** A guard listening to the feed (its gateway-side delegate). */
    public interface Subscriber {
        SourceFilter filter();

        int top();

        /** Deliver one {@code screensaver-alarms} payload to the browser. */
        void push(JsonObject payload);
    }

    private static final class Slot {
        final Subscriber subscriber;
        String lastBody;
        long lastSent;
        long seq;

        Slot(Subscriber subscriber) {
            this.subscriber = subscriber;
        }
    }

    private final Supplier<List<ActiveAlarm>> source;
    private final LongSupplier clock;
    private final List<Slot> slots = new CopyOnWriteArrayList<>();
    private volatile List<ActiveAlarm> latest = List.of();
    private volatile boolean healthy = true;
    private ScheduledExecutorService executor;

    public AlarmFeed(Supplier<List<ActiveAlarm>> source, LongSupplier clock) {
        this.source = source;
        this.clock = clock;
    }

    /** The live feed: the gateway's alarm status, read on a daemon thread. */
    public static AlarmFeed forGateway(AlarmManager alarms) {
        AlarmFeed feed = new AlarmFeed(() -> fromGateway(alarms), System::currentTimeMillis);
        feed.start();
        return feed;
    }

    static List<ActiveAlarm> fromGateway(AlarmManager alarms) {
        List<ActiveAlarm> out = new ArrayList<>();
        for (AlarmEvent e : alarms.queryStatus(new AlarmFilter())) {
            if (e.getState() == null || !e.getState().isActive() || e.isShelved()) {
                continue;
            }
            String label = e.getLabel();
            if (label == null || label.isEmpty()) {
                label = e.getName();
            }
            long since = e.getActiveData() != null ? e.getActiveData().getTimestamp() : 0L;
            out.add(new ActiveAlarm(
                e.getSource() == null ? "" : e.getSource().toString(),
                e.getDisplayPathOrSource(),
                label,
                e.getPriority() == null ? ActiveAlarm.LOW : e.getPriority().getIntValue(),
                e.getState().isAcked(),
                since));
        }
        return out;
    }

    synchronized void start() {
        if (executor != null) {
            return;
        }
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "mustry-screensaver-alarm-feed");
            t.setDaemon(true);
            return t;
        });
        executor.scheduleWithFixedDelay(this::tickSafely, 0, POLL_MS, TimeUnit.MILLISECONDS);
    }

    public synchronized void shutdown() {
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
        slots.clear();
    }

    public void subscribe(Subscriber s) {
        for (Slot slot : slots) {
            if (slot.subscriber == s) {
                return;
            }
        }
        slots.add(new Slot(s));
    }

    public void unsubscribe(Subscriber s) {
        slots.removeIf(slot -> slot.subscriber == s);
    }

    /** Send this subscriber its summary now (after it subscribed or changed its filter). */
    public void pushNow(Subscriber s) {
        if (!healthy) {
            return;
        }
        for (Slot slot : slots) {
            if (slot.subscriber == s) {
                send(slot, latest, clock.getAsLong(), true);
            }
        }
    }

    int subscriberCount() {
        return slots.size();
    }

    private void tickSafely() {
        try {
            tick();
        } catch (Throwable t) {
            // Say nothing to the guards: their feeds go stale and they fail open,
            // which is the safe answer when we cannot read the alarms.
            if (healthy) {
                log.warn("Could not read the gateway alarm status; Idle Guards will fail open until it recovers.", t);
            }
            healthy = false;
        }
    }

    /** One poll: read the alarms, then update every subscriber. Package-private for tests. */
    void tick() {
        List<ActiveAlarm> alarms = source.get();
        if (!healthy) {
            log.info("Gateway alarm status readable again; Idle Guard feeds resume.");
        }
        healthy = true;
        latest = List.copyOf(alarms);
        long now = clock.getAsLong();
        for (Slot slot : slots) {
            send(slot, latest, now, false);
        }
    }

    private void send(Slot slot, List<ActiveAlarm> alarms, long now, boolean force) {
        Subscriber s = slot.subscriber;
        JsonObject body;
        try {
            body = AlarmSummary.of(alarms, s.filter(), s.top());
        } catch (RuntimeException e) {
            log.warn("Could not summarise alarms for an Idle Guard", e);
            return;
        }
        String text = body.toString();
        synchronized (slot) {
            boolean changed = !text.equals(slot.lastBody);
            if (!force && !changed && now - slot.lastSent < HEARTBEAT_MS) {
                return;
            }
            slot.lastBody = text;
            slot.lastSent = now;
            body.addProperty("seq", ++slot.seq);
            body.addProperty("sentAt", now);
        }
        try {
            s.push(body);
        } catch (RuntimeException e) {
            log.debug("Idle Guard push failed (session closing?)", e);
        }
    }
}
