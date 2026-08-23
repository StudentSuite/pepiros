/**
 * "Mesh drift": the calm, slow-moving lavender gradient behind hero and CTA
 * bands (§1-2 of the approved rebuild plan).
 *
 * AUTHORSHIP NOTE, read before touching this file. The plan this repo works
 * from describes a specific shader as already existing ("the shader Anay
 * specced", "used exactly as supplied, do not refactor it") and documents its
 * public uniform names and a packed 7-`vec4` + 8-colour-`vec3` layout. That
 * source was never present anywhere in this repository or in
 * design/refs/design/capsules -- confirmed by a full-repo search -- so there
 * was nothing to copy. Anay confirmed 2026-08-23 that no such file exists and
 * asked for an original implementation instead.
 *
 * What follows is therefore an ORIGINAL shader, authored to the plan's
 * DESCRIBED BEHAVIOUR rather than to its exact (unavailable) uniform layout:
 *
 *   - Gaussian-weighted colour blobs: shade(p) accumulates
 *     exp(-dot(p-c, p-c) * 6.0) per blob, exactly the formula the plan gives.
 *   - Eight blobs, frequencies fx = 0.21 + i*0.071 and fy = 0.17 + i*0.093 for
 *     i in 0..7, taken verbatim from the plan's §9 note on why the loop
 *     cannot close (the frequencies are mutually incommensurate by
 *     construction, which is what makes that note true here too).
 *   - OKLab colour mixing behind a toggle, matching the plan's
 *     "u_transform.w flipped 0 -> 1, OKLab ON" correction (a lavender ramp
 *     visibly bands in sRGB).
 *   - Domain warp and a soften ("blur") control, both defaulted OFF, matching
 *     "u_warp = 0.0 and u_blur = 0.0" for the homepage's own bands.
 *   - Grain is deliberately NOT drawn here. It stays where app/globals.css
 *     already puts it (.paper-grain, tiling public/paper-grain.png as a CSS
 *     overlay), which is simpler than a second grain implementation and
 *     matches how the plan describes layering it ("the page adds
 *     public/paper-grain.png").
 *
 * Uniforms are plain, individually named values rather than the plan's packed
 * vec4 scheme, because reproducing an exact slot layout I cannot check against
 * a real source would be guessing at a contract, not honouring one. Named
 * uniforms are equally valid GLSL ES 1.00 and stay well inside WebGL1's
 * guaranteed MAX_FRAGMENT_UNIFORM_VECTORS floor of 16: this shader declares 4
 * `vec3` (colours) + 8 scalars/`vec2`s, comfortably under that floor on any
 * conformant implementation.
 */

export const MESH_DRIFT_VERTEX = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const MESH_DRIFT_FRAGMENT = `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
/** The 4 lavender stops, low to high (see the palette table in the plan). */
uniform vec3  u_colors[4];
/** Domain-warp amount. 0 = off, matching the homepage bands. */
uniform float u_warp;
/**
 * Single-pass "soften" control, 0..1. A real post-blur needs a second pass
 * (ping-pong render targets), which is out of scope for one fullscreen
 * triangle. This approximates it by widening each blob's Gaussian falloff,
 * which reads as softer edges without a second draw call. 0 = off.
 */
uniform float u_soften;
/** 0 = blend blobs in sRGB (visibly bands on this ramp). 1 = blend in OKLab. */
uniform float u_oklab;
/** Hash seed, so two Band instances on one canvas can still look distinct. */
uniform float u_seed;
uniform vec2  u_cursor;
/** 0 = cursor term fully off (the default; this build never wires a live cursor in). */
uniform float u_cursorPresence;

const float TAU = 6.28318530718;

/* ---- mediump-safe hash --------------------------------------------------
 * mediump float only guarantees roughly ±2^14 of precision. A hash built on
 * a raw large multiplier (the usual sin(dot(p, big)) * bigger trick)
 * quantises badly once the accumulated phase drifts past that range over a
 * long-running RAF loop. mod()-ing the input down first keeps every
 * intermediate value inside mediump's safe zone regardless of how long the
 * canvas has been running.
 */
float hash11(float x) {
  float p = fract(mod(x, 31.0) * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 hash21(float x) {
  return vec2(hash11(x), hash11(x + 17.0));
}

/* ---- sRGB <-> OKLab, standard coefficients ------------------------------- */
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 linearToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  vec3 lms = pow(vec3(l, m, s), vec3(1.0 / 3.0));
  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
  );
}
vec3 oklabToLinear(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  vec3 lms = vec3(l_, m_, s_);
  lms = lms * lms * lms;
  return vec3(
    4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
  );
}

/** Blend two sRGB colours, either directly or through OKLab per u_oklab. */
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linearToOklab(srgbToLinear(a));
    vec3 lb = linearToOklab(srgbToLinear(b));
    return linearToSrgb(oklabToLinear(mix(la, lb, t)));
  }
  return mix(a, b, t);
}

/**
 * One blob's drifting centre.
 *
 * Frequencies are the plan's own (fx = 0.21 + i*0.071, fy = 0.17 + i*0.093),
 * chosen there specifically because they are mutually incommensurate: no
 * finite duration returns every blob to its start position at once, which is
 * what keeps the drift from ever reading as a visible loop.
 */
vec2 blobCenter(int i, float fi) {
  float fx = 0.21 + fi * 0.071;
  float fy = 0.17 + fi * 0.093;
  vec2 phase = hash21(fi + u_seed) * TAU;
  vec2 wander = vec2(
    cos(u_time * fx + phase.x),
    sin(u_time * fy + phase.y)
  );
  return vec2(0.5) + 0.40 * wander;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // Correct for non-square viewports so blobs stay circular rather than
  // stretching into ellipses on a wide window.
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;
  vec2 centerOffset = vec2(0.5 * (u_resolution.x / u_resolution.y - 1.0), 0.0);

  // Domain warp: displace the sample point by a slow secondary drift before
  // evaluating blobs against it. Off by default (u_warp = 0).
  if (u_warp > 0.0001) {
    vec2 w = vec2(
      hash11(p.x * 3.1 + u_time * 0.05),
      hash11(p.y * 3.7 - u_time * 0.04)
    ) - 0.5;
    p += w * u_warp * 0.25;
  }

  float sharpness = 6.0 / (1.0 + u_soften * 3.0);

  vec3 accum = vec3(0.0);
  float weightSum = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 c = blobCenter(i, fi) + centerOffset;
    vec2 d = p - c;
    float weight = exp(-dot(d, d) * sharpness);
    // GLSL ES 1.00 has no integer % operator (that needs ES 3.00+), and
    // array indexing must stay a simple function of the loop induction
    // variable for ANGLE (WebGL1's D3D9 backend on Windows) to unroll it.
    // i - (i / 4) * 4 satisfies both: integer division floors, so this is
    // i mod 4 built from operators ES 1.00 actually has.
    vec3 stop = u_colors[i - (i / 4) * 4];
    accum = mixColour(accum, stop, weight / (weightSum + weight + 0.0001));
    weightSum += weight;
  }

  // Optional cursor term, gated fully off by u_cursorPresence in every call
  // site this build wires up. Kept so a future interactive pass has
  // somewhere to plug in without touching the rest of the shader.
  if (u_cursorPresence > 0.001) {
    vec2 cd = p - u_cursor;
    float cw = exp(-dot(cd, cd) * sharpness * 1.5) * u_cursorPresence;
    accum = mixColour(accum, u_colors[3], cw * 0.5);
  }

  // Weak vignette toward the deepest stop, so a band's edges settle rather
  // than cutting the gradient off hard.
  float edge = length(uv - 0.5);
  accum = mixColour(accum, u_colors[0], smoothstep(0.55, 0.95, edge) * 0.35);

  gl_FragColor = vec4(accum, 1.0);
}
`;

/** Default uniform values, tuned for the calm/slow read the plan asks for. */
export const MESH_DRIFT_DEFAULTS = {
  warp: 0,
  soften: 0,
  oklab: 1,
  /** Matches the plan's own note verbatim: `seconds * 0.73`. */
  timeScale: 0.73,
  cursorPresence: 0,
} as const;

/**
 * The 4 lavender stops, low to high, exactly as given in the plan's palette
 * table (§1). Unlike the shader source itself, this table WAS a concrete,
 * checkable spec, so these are copied rather than authored.
 *
 * Exported as hex so `Band.tsx`'s zero-JS CSS gradient fallback can build the
 * exact same ramp the shader draws, and both stay in sync from one array
 * rather than two hand-kept copies.
 */
export const MESH_DRIFT_PALETTE_HEX = ["#0E0A14", "#6D4AA8", "#B58ACF", "#F0E6D8"] as const;

/** Hex -> [0,1] float triple, for feeding the palette into `u_colors`. */
export function hexToVec3(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
