import { visionModel } from "@/lib/ai/client";
import type { GeneratorConfig } from "./runGenerator";

/**
 * Vision tier -- one node discussing the paper's key figure(s). Unblocked by
 * issue #59: scripts/parse.py now crops each detected figure region to a PNG
 * and pairs it with its nearby caption (a real `figure_caption`-kind chunk,
 * citable like any other), so this generator has both an actual image to
 * look at and a real ref id to cite for what the caption says. The image
 * itself is never citable evidence -- only the caption chunk is, since
 * that's the thing lib/services/verify.ts can re-check against the corpus.
 */
export const figuresGenerator: GeneratorConfig = {
  name: "figures",
  model: visionModel,
  systemPrompt: `Generator: figures.

You are shown one or more cropped images from the paper, each labeled with the ref id of its caption chunk in the context block. Describe what each figure actually shows and why it matters to the paper's argument -- what kind of plot/diagram/photo it is, what the axes or panels represent, and what result or claim it's illustrating. Do not describe the image in isolation from the paper's argument (e.g. don't just say "this is a bar chart with blue and orange bars" -- say what the bars represent and what conclusion the paper draws from them).

Cite the figure's caption chunk (the ref id given alongside its image) for claims about what the figure depicts -- that chunk's text is the only thing a downstream verifier can re-check, so never cite an id that wasn't given to you. If the context block contains no figure_caption-kind excerpt and you were given no images, say so plainly rather than inventing a figure to discuss.`,
};
