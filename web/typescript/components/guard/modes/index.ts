// Picks the renderer for a canvas mode: WebGL2 when the browser has it, else
// a simpler 2D version. A GL failure after the context exists (a shader the
// driver rejects) leaves the canvas unusable for 2D, so the caller retries the
// 2D fallback on a fresh canvas.
import { Mode } from '../guardProps';
import { AuroraGL } from './gl/aurora';
import { HaloGL } from './gl/halo';
import { PipesGL } from './gl/pipesGL';
import { StarfieldGL } from './gl/starfieldGL';
import { PipesRenderer } from './pipes';
import { QualitySetting } from './quality';
import { ModeRenderer } from './renderer';
import { Starfield } from './starfield';

let warned = false;

export function createGLRenderer(mode: Mode, canvas: HTMLCanvasElement, quality: QualitySetting): ModeRenderer | null {
    try {
        switch (mode) {
            case 'pipes':
                return new PipesGL(canvas, quality);
            case 'aurora':
                return new AuroraGL(canvas, quality);
            case 'halo':
                return new HaloGL(canvas, quality);
            case 'starfield':
                return new StarfieldGL(canvas, quality);
            default:
                return null;
        }
    } catch (e) {
        if (!warned) {
            warned = true;
            // A warning, not an error: the fallback works, and kiosk consoles get read for errors.
            console.warn(`Mustry Screensaver: WebGL2 unavailable (${e instanceof Error ? e.message : e}); using the 2D modes.`);
        }
        return null;
    }
}

/** The 2D stand-in: pipes keeps its own 2D drawing; aurora, halo and starfield fall back to the 2D starfield. */
export function create2DRenderer(mode: Mode, canvas: HTMLCanvasElement): ModeRenderer {
    return mode === 'pipes' ? new PipesRenderer(canvas) : new Starfield(canvas);
}
