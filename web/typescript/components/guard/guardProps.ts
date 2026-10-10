// Reads the Perspective PropertyTree into the typed props the Idle Guard uses.
import { DimConfig, priorityIndex } from './idleLogic';

/** The PropertyTree readers we use, kept structural so the mapper is node-testable. */
export interface PropReader {
    readString(path: string, defaultValue?: string): string;
    readBoolean(path: string, defaultValue?: boolean): boolean;
    readNumber<T>(path: string, defaultValue: T): T;
    readArray(path: string, defaultValue?: never[]): unknown[];
    readLength(path: string): number;
}

export const MODES = ['starfield', 'pipes', 'clock', 'blank', 'external'] as const;
export type Mode = typeof MODES[number];

export function normMode(value: string): Mode {
    const v = (value || '').trim().toLowerCase();
    return (MODES as readonly string[]).includes(v) ? v as Mode : 'starfield';
}

export interface PipeSpec {
    label: string;
    state: string;
    flow: number;
    color: string;
}

export interface GuardProps {
    config: {
        enabled: boolean;
        timeoutSec: number;
        mode: Mode;
        wakeOnMove: boolean;
        moveThresholdPx: number;
        wakeLock: boolean;
    };
    alarm: {
        wakePriority: number;
        pinPriority: number;
        includeAcked: boolean;
        sources: string[];
        staleAfterSec: number;
    };
    burnIn: {
        drift: boolean;
        dim: DimConfig;
    };
    modes: {
        clock: { title: string; showSeconds: boolean };
        starfield: { speed: number; color: string; density: number; caption: string };
        pipes: { pipes: PipeSpec[]; legend: boolean; resetAfterSec: number };
    };
}

/** The default pipe set, so a freshly dropped guard in pipes mode shows something. */
export const DEFAULT_PIPES: PipeSpec[] = [
    { label: 'Line 1', state: 'running', flow: 0.8, color: '' },
    { label: 'Line 2', state: 'running', flow: 0.5, color: '' },
    { label: 'CIP', state: 'idle', flow: 0.2, color: '' },
    { label: 'Utilities', state: 'warning', flow: 0.6, color: '' }
];

/** At most this many pipes grow at once; more only crowd the grid. */
export const MAX_PIPES = 12;

/** modes.pipes.pipes, item by item. Empty means the demo set: a pipes screensaver without pipes is a black screen. */
function readPipes(tree: PropReader): PipeSpec[] {
    const base = 'modes.pipes.pipes';
    const n = Math.min(tree.readLength(base), MAX_PIPES);
    if (n === 0) {
        return DEFAULT_PIPES;
    }
    const out: PipeSpec[] = [];
    for (let i = 0; i < n; i++) {
        const p = `${base}[${i}]`;
        out.push({
            label: tree.readString(`${p}.label`, ''),
            state: tree.readString(`${p}.state`, 'running'),
            flow: Number(tree.readNumber(`${p}.flow`, 0.5)),
            color: tree.readString(`${p}.color`, '')
        });
    }
    return out;
}

export function mapGuardProps(tree: PropReader): GuardProps {
    const wake = priorityIndex(tree.readString('alarm.wakePriority', 'High'), 3);
    return {
        config: {
            enabled: tree.readBoolean('config.enabled', true),
            timeoutSec: Number(tree.readNumber('config.timeoutSec', 600)),
            mode: normMode(tree.readString('config.mode', 'starfield')),
            wakeOnMove: tree.readBoolean('config.wakeOnMove', true),
            moveThresholdPx: Number(tree.readNumber('config.moveThresholdPx', 8)),
            wakeLock: tree.readBoolean('config.wakeLock', false)
        },
        alarm: {
            wakePriority: wake,
            pinPriority: priorityIndex(tree.readString('alarm.pinPriority', 'Medium'), 2),
            includeAcked: tree.readBoolean('alarm.includeAcked', true),
            sources: (tree.readArray('alarm.sources', []) || []).filter((s): s is string => typeof s === 'string' && s.trim() !== ''),
            staleAfterSec: Number(tree.readNumber('alarm.staleAfterSec', 8))
        },
        burnIn: {
            drift: tree.readBoolean('burnIn.drift', true),
            dim: {
                enabled: tree.readBoolean('burnIn.dim.enabled', false),
                from: tree.readString('burnIn.dim.from', '22:00'),
                to: tree.readString('burnIn.dim.to', '06:00'),
                level: Number(tree.readNumber('burnIn.dim.level', 0.4))
            }
        },
        modes: {
            clock: {
                title: tree.readString('modes.clock.title', ''),
                showSeconds: tree.readBoolean('modes.clock.showSeconds', false)
            },
            starfield: {
                speed: Number(tree.readNumber('modes.starfield.speed', 1)),
                color: tree.readString('modes.starfield.color', ''),
                density: Number(tree.readNumber('modes.starfield.density', 400)),
                caption: tree.readString('modes.starfield.caption', '')
            },
            pipes: {
                pipes: readPipes(tree),
                legend: tree.readBoolean('modes.pipes.legend', true),
                resetAfterSec: Number(tree.readNumber('modes.pipes.resetAfterSec', 90))
            }
        }
    };
}
