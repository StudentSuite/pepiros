"use client";

import clsx from "clsx";
import { MESH_DRIFT_GRADIENT_STOPS } from "./mesh-drift.frag";
import { useShaderBand } from "./useShaderBand";
export { bandButtonClassName } from "./band-button";

/**
 * A region where the page's own background steps aside and the shared
 * `<ShaderCanvas>` shows through instead (§2 of the plan).
 *
 * PROGRESSIVE ENHANCEMENT, not a toggle this component decides for itself.
 * Every `<Band>` renders an opaque CSS gradient by default, built from the
 * exact same MESH_DRIFT_PALETTE_HEX the shader draws from, so a band is never
 * blank: not before hydration, not with JS disabled, not on
 * prefers-reduced-motion, not on a device with no WebGL1, not on the coarse
 * low-end heuristic in ShaderCanvas.tsx. That gradient only turns transparent
 * once `<ShaderCanvas>` has an actual frame to show, signalled by the
 * `data-shader-active` attribute it sets on `<html>` -- see the matching CSS
 * rule at the bottom of app/globals.css. A band never has to know which case
 * it's in; the two rules compose correctly on their own.
 *
 * This is also why every fallback path in ShaderCanvas.tsx can simply be
 * "render nothing": with the gradient already covering the canvas by
 * default, doing nothing IS the fallback.
 */
export function Band({
  children,
  className,
  as: Component = "div",
  /**
   * Bands on a light page are meant to be full-bleed dark interruptions
   * (§1 "Light mode: light base, shader confined to dark full-bleed bands").
   * `light` opts a band out of that for the few places the plan wants a
   * slim, less dramatic strip instead (page-header bands, the auth panel).
   */
  variant = "dark",
}: {
  children?: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "header";
  variant?: "dark" | "light";
}) {
  // Without this, ShaderCanvas has no way to know this band exists at all --
  // it never appears in getBands(), the IntersectionObserver never watches
  // it, and the RAF loop's "is anything visible" check stays permanently
  // false. The canvas then never calls drawArrays, and the region behind
  // this band renders whatever the WebGL context's uninitialized buffer
  // happens to be (opaque black, with `alpha: false`) instead of the shader.
  const bandRef = useShaderBand();

  return (
    <Component
      ref={bandRef}
      className={clsx(
        "shader-band relative isolate overflow-hidden",
        variant === "dark" && "text-brand-ink-reversed",
        className,
      )}
      style={{
        // Six stops, not four: the two extra are OKLab-derived midpoints that
        // keep this sRGB gradient on the route the shader takes. See
        // MESH_DRIFT_GRADIENT_STOPS in mesh-drift.frag.ts for why the neon
        // ramp needs them and the old lavender one did not (issue #339).
        backgroundImage: `linear-gradient(160deg, ${MESH_DRIFT_GRADIENT_STOPS})`,
      } as React.CSSProperties}
    >

      {/*
       * The contrast scrim, and why it is not optional.
       *
       * Plan §8 states the actual bar: "every text placed over a shader
       * band clears it against the band's LIGHTEST frame, not its
       * average." The mesh-drift shader legitimately cycles through its own
       * lightest stop (#F0E6D8, near-white bone) at every point on screen
       * as its blobs drift -- confirmed by testing this page live rather
       * than against a single static screenshot: a first pass shipped
       * --brand-ink-reversed text directly on the raw shader with no scrim,
       * and it read fine in the frame that happened to be dark when one
       * screenshot was taken, then went NEAR-INVISIBLE on the very next
       * reload once the animation had drifted into its lighter register,
       * in both themes (the shader itself is theme-independent). A
       * one-off "looked fine" is not the same as "clears the lightest
       * frame" for content that keeps moving.
       *
       * The fix is a scrim: a fixed-opacity dark layer between the shader
       * and the content, dark enough that --brand-ink-reversed text (near
       * white) stays comfortably above 4.5:1 even when the shader
       * underneath it is at its own lightest, animated extreme.
       *
       * RE-MEASURED 2026-09-02 for the neon ramp (issue #336), and the
       * result inverts what the issue assumed. Neon reads as brighter
       * because it is far more saturated, but saturation is not luminance:
       *
       *   old lightest stop  #F0E6D8   relative luminance 0.801
       *   new lightest stop  #00E58C   relative luminance 0.579
       *
       * The worst case this scrim defends against therefore got EASIER, not
       * harder, so the scrim comes down rather than up.
       *
       * Measured against the new worst case (--brand-ink-reversed, #FAF8F4,
       * over the palette's lightest stop #00E58C, the one colour a blob's
       * Gaussian weighting could in principle push a pixel arbitrarily close
       * to), with the scrim composited in gamma-encoded sRGB the way a
       * browser does it:
       *
       *   45%  ->  4.75:1   legal, no margin
       *   55%  ->  6.40:1   <- chosen
       *   60%  ->  7.47:1   the old value, now over-darkens the ramp
       *
       * 55% holds the same "real margin, not a number that only just clears
       * the bar" standard the previous 62%/6.1:1 note set, while letting
       * appreciably more of the ramp through. Holding 60% here would have
       * spent the whole luminance saving on a scrim nobody asked for.
       *
       * The scrim colour is now --band-scrim rather than a literal hex, so
       * it tracks the ramp's ground stop from one place in app/globals.css.
       */}
      <div className="absolute inset-0 bg-band-scrim/55" />

      <div className="relative z-10">{children}</div>
    </Component>
  );
}

