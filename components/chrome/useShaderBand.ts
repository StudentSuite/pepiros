"use client";

import { useEffect, useRef } from "react";

/**
 * Shared registry of every mounted `<Band>`'s DOM node.
 *
 * `ShaderCanvas` is mounted exactly once in the root layout and needs to know
 * whether ANY band is currently in the viewport, across however many pages'
 * worth of `<Band>` instances have come and gone during client-side
 * navigation. A module-level singleton is the simplest thing that is
 * correct here: there is exactly one canvas, so there only needs to be one
 * registry, and a React context would just be routing the same single value
 * through a provider tree for no benefit.
 */
type Listener = () => void;

const bands = new Set<Element>();
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

export function registerBand(el: Element): void {
  bands.add(el);
  notify();
}

export function unregisterBand(el: Element): void {
  bands.delete(el);
  notify();
}

export function getBands(): ReadonlySet<Element> {
  return bands;
}

/** Fires whenever a band registers or unregisters. */
export function subscribeBands(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Registers a DOM node as a shader band for the lifetime of the component
 * that calls this. Returns a ref callback to attach to the band's root
 * element.
 */
export function useShaderBand(): (el: HTMLElement | null) => void {
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (current.current) unregisterBand(current.current);
    };
  }, []);

  return (el: HTMLElement | null) => {
    if (current.current === el) return;
    if (current.current) unregisterBand(current.current);
    current.current = el;
    if (el) registerBand(el);
  };
}
