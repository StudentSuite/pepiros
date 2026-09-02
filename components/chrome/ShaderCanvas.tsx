"use client";

import { useEffect, useRef } from "react";
import {
  MESH_DRIFT_DEFAULTS,
  MESH_DRIFT_FRAGMENT,
  MESH_DRIFT_PALETTE_HEX,
  MESH_DRIFT_VERTEX,
  hexToVec3,
} from "./mesh-drift.frag";
import { getBands, subscribeBands } from "./useShaderBand";

/**
 * The one shared shader canvas, mounted once in the root layout (§2 of the
 * plan: "one fixed full-viewport canvas at z-index: -1... one context, one
 * RAF, and 'everywhere' costs exactly what 'hero only' costs").
 *
 * `<Band>` components render a transparent-background region wherever this
 * should show through; this component itself never knows what a band looks
 * like or where one is on the page, only whether at least one is currently
 * in the viewport (via the shared registry in useShaderBand.ts), which is
 * all it needs to decide whether to keep the RAF loop running.
 *
 * FALLBACKS. §2 is explicit that the shader must never be the only path. This
 * build's fallback is `<Band>`'s own CSS gradient background (built from the
 * same MESH_DRIFT_PALETTE_HEX this canvas draws from), which is present
 * unconditionally and needs no JS, no WebGL, and no capability check to
 * render. So the simplest correct thing this component can do for every
 * fallback case is nothing: return null and let that gradient stand alone.
 *   - prefers-reduced-motion: this component never mounts a canvas.
 *   - no WebGL1 context: caught below, same result.
 *   - low-end device: a coarse deviceMemory/hardwareConcurrency heuristic,
 *     same result.
 * What this build does NOT implement is the plan's build-time poster capture
 * (pixel-identical stills rendered from this exact shader via vidstudio,
 * §9). That needs a headless-GPU render pipeline in a different repo and is
 * flagged as follow-up work, not silently skipped.
 */
export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (shouldSkipShader()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const glAttrs = { antialias: false, depth: false, alpha: false } as const;
    // Some hardening/privacy browser modes (Brave's Shields fingerprinting
    // protection is the common one) only expose the legacy
    // "experimental-webgl" name, or block "webgl" outright while still
    // permitting it -- worth one extra attempt before accepting the
    // opaque-black-canvas fallback. If both fail, this really is the
    // browser withholding WebGL for this origin (a per-site permission,
    // not something a page can override), and Band's own CSS gradient
    // fallback is the correct, already-graceful result.
    const gl =
      (canvas.getContext("webgl", glAttrs) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl", glAttrs) as WebGLRenderingContext | null);
    if (!gl) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[ShaderCanvas] no WebGL context available -- falling back to Band's CSS gradient. " +
            "If this is unexpected, check the browser's fingerprinting/shield settings for this origin.",
        );
      }
      return;
    }

    const program = buildProgram(gl);
    if (!program) return;

    const cleanup = runMeshDrift(gl, program, canvas);
    return cleanup;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] h-full w-full"
    />
  );
}

function shouldSkipShader(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;

  // Coarse low-end heuristic. Neither signal is universally supported (both
  // are Chromium-only today), so this only ever SKIPS the shader on a device
  // that positively reports as constrained -- it never blocks a device that
  // simply doesn't expose the API, which would wrongly punish every browser
  // that hasn't shipped these yet.
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return true;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;

  return false;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[ShaderCanvas] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, MESH_DRIFT_VERTEX);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, MESH_DRIFT_FRAGMENT);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[ShaderCanvas] program link failed:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

const MAX_DPR = 2;

function runMeshDrift(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  canvas: HTMLCanvasElement,
): () => void {
  gl.useProgram(program);

  // Fullscreen triangle: three vertices covering the whole clip space, one
  // draw call, no quad/index buffer. Cheaper than a quad and the standard
  // trick for a single full-screen fragment pass.
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const positionLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    time: gl.getUniformLocation(program, "u_time"),
    colors: gl.getUniformLocation(program, "u_colors"),
    warp: gl.getUniformLocation(program, "u_warp"),
    soften: gl.getUniformLocation(program, "u_soften"),
    oklab: gl.getUniformLocation(program, "u_oklab"),
    seed: gl.getUniformLocation(program, "u_seed"),
    cursor: gl.getUniformLocation(program, "u_cursor"),
    cursorPresence: gl.getUniformLocation(program, "u_cursorPresence"),
  };

  const palette = new Float32Array(MESH_DRIFT_PALETTE_HEX.flatMap((hex) => hexToVec3(hex)));
  gl.uniform3fv(uniforms.colors, palette);
  gl.uniform1f(uniforms.warp, MESH_DRIFT_DEFAULTS.warp);
  gl.uniform1f(uniforms.soften, MESH_DRIFT_DEFAULTS.soften);
  gl.uniform1f(uniforms.oklab, MESH_DRIFT_DEFAULTS.oklab);
  gl.uniform1f(uniforms.seed, 7.0);
  gl.uniform2f(uniforms.cursor, 0, 0);
  gl.uniform1f(uniforms.cursorPresence, MESH_DRIFT_DEFAULTS.cursorPresence);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.round(window.innerWidth * dpr);
    const height = Math.round(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(uniforms.resolution, width, height);
  }
  resize();
  window.addEventListener("resize", resize);

  // Visible-band tracking: RAF only runs while at least one <Band> is both
  // registered and actually intersecting the viewport. On a dense app page
  // with no band on screen at all, this is a free win -- the shader never
  // draws a frame nobody can see.
  //
  // A Set of currently-intersecting elements, not a single boolean flag: the
  // observer callback reports on whichever elements changed state, and a
  // naive "did this batch contain a true" flag would go permanently stale
  // the moment a batch contained only elements leaving the viewport.
  const intersecting = new Set<Element>();
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      }
    },
    { threshold: 0 },
  );

  function syncObservedBands() {
    intersectionObserver.disconnect();
    for (const el of getBands()) intersectionObserver.observe(el);
  }
  syncObservedBands();
  const unsubscribeBands = subscribeBands(syncObservedBands);

  let tabHidden = document.hidden;
  const onVisibility = () => {
    tabHidden = document.hidden;
  };
  document.addEventListener("visibilitychange", onVisibility);

  let rafId = 0;
  const startedAt = performance.now();

  /*
   * Clip the canvas to the visible bands.
   *
   * THE BUG THIS FIXES. This canvas is `position: fixed; z-index: -1` and a
   * band reveals it by turning its own background transparent. That only
   * works if nothing between the canvas and the band paints an opaque colour
   * -- and `body` did. Paint order inside the root stacking context puts
   * negative-z positioned descendants (this canvas) BELOW the backgrounds of
   * in-flow block descendants (body), so body's `background-color` covered
   * the canvas everywhere and no band ever showed the shader. The gradient
   * simply never appeared.
   *
   * Making body transparent reveals the canvas, but then it shows through
   * EVERY unstyled section too, because those sections were relying on
   * inheriting body's opaque colour. That is the /privacy bleed-through the
   * html-background comment in app/globals.css describes. The two failures
   * are the same mechanism seen from opposite sides, and no combination of
   * background colours on html/body fixes both: the canvas either covers
   * everything or nothing.
   *
   * So the canvas stops being full-bleed. body goes transparent (html keeps
   * the opaque --surface, so ordinary sections show a flat surface), and this
   * clips the canvas to exactly the rects of the bands that are on screen.
   * Outside a band the canvas paints nothing at all, which is what makes
   * bleed-through structurally impossible rather than something a future
   * unstyled section can reintroduce.
   *
   * Viewport coordinates need no conversion: the canvas is `fixed inset-0`,
   * so its own box already IS the viewport and getBoundingClientRect() is in
   * the same space. Rects are rounded outwards so a fractional layout never
   * leaves a hairline of surface along a band edge.
   */
  let lastClip = "";
  const CLIP_NOTHING = "inset(50%)";
  canvas.style.clipPath = CLIP_NOTHING;

  function updateClip() {
    let d = "";
    for (const el of intersecting) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const x0 = Math.floor(r.left);
      const y0 = Math.floor(r.top);
      const x1 = Math.ceil(r.right);
      const y1 = Math.ceil(r.bottom);
      // One closed subpath per band. path() takes several, so disjoint bands
      // (a hero and a closing CTA both on screen) clip correctly without
      // needing the degenerate bridging edges a single polygon() would.
      d += `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
    }
    if (d === lastClip) return;
    lastClip = d;
    canvas.style.clipPath = d ? `path("${d}")` : CLIP_NOTHING;
  }

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    // Before the early return, not after: when the last band scrolls out the
    // clip has to collapse, and that is exactly the frame the draw is skipped.
    updateClip();
    if (tabHidden || intersecting.size === 0) return;

    const elapsedSeconds = (now - startedAt) / 1000;
    gl.uniform1f(uniforms.time, elapsedSeconds * MESH_DRIFT_DEFAULTS.timeScale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  rafId = requestAnimationFrame(frame);

  // Progressive enhancement flip. Every `<Band>` renders an opaque CSS
  // gradient by default (its zero-JS fallback), which necessarily sits ON
  // TOP of this canvas in normal stacking order -- the canvas is at
  // `z-index: -1` precisely so a band's own background can cover it until
  // this line runs. Only once a WebGL context has actually linked and the
  // draw loop has started does the canvas get anything to show, so this is
  // also the correct moment to tell every band to turn its own background
  // transparent and let the canvas through. See the `[data-shader-active]`
  // rule in app/globals.css for the other half of this contract.
  document.documentElement.setAttribute("data-shader-active", "true");

  return () => {
    cancelAnimationFrame(rafId);
    document.documentElement.removeAttribute("data-shader-active");
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    intersectionObserver.disconnect();
    unsubscribeBands();
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    // Deliberately NOT calling the WEBGL_lose_context extension here.
    // ShaderCanvas mounts exactly once for the app's whole lifetime (root
    // layout), so this cleanup only ever runs on a true unmount (or React 18
    // Strict Mode's dev-only double-invoke: mount, cleanup, mount again,
    // synchronously). Explicit loseContext() is asynchronous -- the context
    // is not actually gone until a later microtask -- so Strict Mode's
    // immediate remount was calling canvas.getContext("webgl") again on a
    // context still in the process of dying, and getting back a context
    // that compiled and linked nothing while reporting null for every error,
    // which is exactly the "shader compile failed: null" this comment used
    // to cause. The GPU resources this component holds are freed by the
    // browser once the canvas element and its context are garbage collected,
    // same as any other WebGL app; there is no real leak to hurry along here.
  };
}
