/**
 * An IANA time zone in which the local hour is `hour` right now. The guard's
 * night window runs on the browser's local time, so the suite pins a midday
 * zone (no test is surprised by the default 22:00-06:00 window, whenever CI
 * runs) and the night test picks a zone where it is 1 a.m.
 * Etc/GMT zones have inverted signs: Etc/GMT-2 is UTC+2.
 */
export function zoneWhereHourIs(hour: number, now = new Date()): string {
    let offset = (((hour - now.getUTCHours()) % 24) + 24) % 24;
    if (offset > 14) {
        offset -= 24;
    }
    return offset === 0 ? 'Etc/UTC' : `Etc/GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`;
}
