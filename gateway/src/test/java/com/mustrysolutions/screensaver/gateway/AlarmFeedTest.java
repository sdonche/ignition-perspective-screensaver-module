package com.mustrysolutions.screensaver.gateway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

import com.inductiveautomation.ignition.common.gson.JsonObject;

class AlarmFeedTest {

    private static final class Sub implements AlarmFeed.Subscriber {
        final List<JsonObject> got = new ArrayList<>();
        SourceFilter filter = SourceFilter.ALL;

        @Override
        public SourceFilter filter() {
            return filter;
        }

        @Override
        public int top() {
            return 3;
        }

        @Override
        public void push(JsonObject payload) {
            got.add(payload);
        }
    }

    private final AtomicLong now = new AtomicLong(1_000_000);
    private final List<ActiveAlarm> alarms = new ArrayList<>();
    private final AlarmFeed feed = new AlarmFeed(() -> List.copyOf(alarms), now::get);

    @Test
    void sendsOnChangeAndAsHeartbeat() {
        Sub s = new Sub();
        feed.subscribe(s);
        feed.tick();
        assertEquals(1, s.got.size(), "first tick sends");

        now.addAndGet(500);
        feed.tick();
        assertEquals(1, s.got.size(), "nothing changed, no heartbeat due");

        alarms.add(new ActiveAlarm("s", "d", "l", ActiveAlarm.HIGH, false, 1));
        now.addAndGet(500);
        feed.tick();
        assertEquals(2, s.got.size(), "a change goes out at once");
        assertEquals(1, s.got.get(1).getAsJsonObject("active").get("high").getAsInt());

        now.addAndGet(AlarmFeed.HEARTBEAT_MS);
        feed.tick();
        assertEquals(3, s.got.size(), "heartbeat when unchanged");
        assertTrue(s.got.get(2).get("seq").getAsLong() > s.got.get(1).get("seq").getAsLong());
        assertEquals(now.get(), s.got.get(2).get("sentAt").getAsLong());
    }

    @Test
    void eachSubscriberSeesItsOwnFilter() {
        Sub all = new Sub();
        Sub line2 = new Sub();
        line2.filter = SourceFilter.of(List.of("Line 2*"));
        alarms.add(new ActiveAlarm("s", "Line 1/x", "l", ActiveAlarm.CRITICAL, false, 1));
        feed.subscribe(all);
        feed.subscribe(line2);
        feed.subscribe(all); // idempotent
        assertEquals(2, feed.subscriberCount());
        feed.tick();
        assertEquals(1, all.got.get(0).getAsJsonObject("active").get("critical").getAsInt());
        assertEquals(0, line2.got.get(0).getAsJsonObject("active").get("critical").getAsInt());
    }

    @Test
    void pushNowAndUnsubscribe() {
        Sub s = new Sub();
        feed.subscribe(s);
        feed.pushNow(s);
        feed.pushNow(s);
        assertEquals(2, s.got.size(), "pushNow ignores the heartbeat timer");
        feed.unsubscribe(s);
        now.addAndGet(10_000);
        feed.tick();
        assertEquals(2, s.got.size());
        assertEquals(0, feed.subscriberCount());
    }
}
