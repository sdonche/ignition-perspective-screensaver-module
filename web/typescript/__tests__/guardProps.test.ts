import { DEFAULT_PIPES, mapGuardProps, normMode, PropReader } from '../components/guard/guardProps';

/** A PropertyTree stand-in over a plain object, with 'a.b[0].c' paths. */
function tree(obj: Record<string, unknown>): PropReader {
    const get = (path: string): unknown => {
        let cur: unknown = obj;
        for (const part of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
            if (cur === null || typeof cur !== 'object') {
                return undefined;
            }
            cur = (cur as Record<string, unknown>)[part];
        }
        return cur;
    };
    return {
        readString: (p, d = '') => (typeof get(p) === 'string' ? get(p) as string : d),
        readBoolean: (p, d = false) => (typeof get(p) === 'boolean' ? get(p) as boolean : d),
        readNumber: <T>(p: string, d: T) => (typeof get(p) === 'number' ? get(p) as unknown as T : d),
        readArray: (p, d = []) => (Array.isArray(get(p)) ? get(p) as unknown[] : d),
        readLength: (p) => (Array.isArray(get(p)) ? (get(p) as unknown[]).length : 0)
    };
}

describe('mapGuardProps', () => {
    it('applies schema defaults to an empty tree', () => {
        const p = mapGuardProps(tree({}));
        expect(p.config).toEqual({ enabled: true, timeoutSec: 600, mode: 'starfield', wakeOnMove: true, moveThresholdPx: 8, wakeLock: false });
        expect(p.alarm).toEqual({ wakePriority: 3, pinPriority: 2, includeAcked: true, sources: [], staleAfterSec: 8 });
        expect(p.modes.pipes.pipes).toBe(DEFAULT_PIPES);
    });

    it('reads bound values', () => {
        const p = mapGuardProps(tree({
            config: { mode: 'Pipes', timeoutSec: 30 },
            alarm: { wakePriority: 'Critical', pinPriority: 'Low', sources: ['Line 1*', '', 3] },
            modes: { pipes: { pipes: [{ label: 'Boiler', state: 'fault', flow: 1.5 }, { label: 'Feed' }] } }
        }));
        expect(p.config.mode).toBe('pipes');
        expect(p.config.timeoutSec).toBe(30);
        expect(p.alarm.wakePriority).toBe(4);
        expect(p.alarm.pinPriority).toBe(1);
        expect(p.alarm.sources).toEqual(['Line 1*']);
        expect(p.modes.pipes.pipes).toEqual([
            { label: 'Boiler', state: 'fault', flow: 1.5, color: '' },
            { label: 'Feed', state: 'running', flow: 0.5, color: '' }
        ]);
    });

    it('caps the number of pipes', () => {
        const pipes = Array.from({ length: 30 }, (_, i) => ({ label: `P${i}` }));
        expect(mapGuardProps(tree({ modes: { pipes: { pipes } } })).modes.pipes.pipes).toHaveLength(12);
    });

    it('falls back to starfield for unknown modes', () => {
        expect(normMode('toasters')).toBe('starfield');
        expect(normMode(' CLOCK ')).toBe('clock');
    });
});
