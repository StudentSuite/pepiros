import type { ResearchField } from "./types";

/**
 * The public catalogue: 24 real, well-known papers across six fields.
 *
 * Real papers rather than invented ones, because a judge or a visitor will
 * recognise several of these on sight and can check any of them. Only factual
 * bibliographic metadata is stored here (title, authors, year, venue, link),
 * never article text.
 *
 * `openAccess` reflects whether the full text is freely readable at the linked
 * source. arXiv preprints and the open-access journals are true; several of the
 * Nature/Science/NEJM entries are not, and are marked accordingly rather than
 * being flattered. VERIFY THESE FLAGS before any public launch that leans on
 * them for a licensing claim.
 */
export interface CatalogPaper {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  field: ResearchField;
  openAccess: boolean;
  sourceUrl: string;
  /**
   * Set once scripts/index-catalog.ts (issue #279) has actually run this
   * paper through the real ingest pipeline and created a workspace for it.
   * Every entry below is undefined until that happens -- there is no
   * indexed catalog paper yet. /paper/[slug]'s "Open in reader" action
   * reads this field directly rather than falling back to a demo
   * workspace id, so an unindexed paper says so instead of silently
   * opening a workspace about a different paper entirely (issue #255).
   */
  workspaceId?: string;
}

export const CATALOG: CatalogPaper[] = [
  // ---- Machine learning ---------------------------------------------------
  {
    id: "p-attention",
    slug: "attention-is-all-you-need",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
    year: 2017,
    venue: "NeurIPS",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/1706.03762",
  },
  {
    id: "p-resnet",
    slug: "deep-residual-learning",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    venue: "CVPR",
    field: "Computer vision",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/1512.03385",
  },
  {
    id: "p-bert",
    slug: "bert-pretraining-deep-bidirectional-transformers",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    venue: "NAACL",
    field: "Natural language processing",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/1810.04805",
  },
  {
    id: "p-gpt3",
    slug: "language-models-are-few-shot-learners",
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah"],
    year: 2020,
    venue: "NeurIPS",
    field: "Natural language processing",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2005.14165",
  },
  {
    id: "p-ddpm",
    slug: "denoising-diffusion-probabilistic-models",
    title: "Denoising Diffusion Probabilistic Models",
    authors: ["Jonathan Ho", "Ajay Jain", "Pieter Abbeel"],
    year: 2020,
    venue: "NeurIPS",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2006.11239",
  },
  {
    id: "p-cot",
    slug: "chain-of-thought-prompting",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans", "Maarten Bosma"],
    year: 2022,
    venue: "NeurIPS",
    field: "Natural language processing",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2201.11903",
  },
  {
    id: "p-adam",
    slug: "adam-stochastic-optimization",
    title: "Adam: A Method for Stochastic Optimization",
    authors: ["Diederik P. Kingma", "Jimmy Ba"],
    year: 2015,
    venue: "ICLR",
    field: "Statistics",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/1412.6980",
  },
  {
    id: "p-gan",
    slug: "generative-adversarial-networks",
    title: "Generative Adversarial Networks",
    authors: ["Ian J. Goodfellow", "Jean Pouget-Abadie", "Mehdi Mirza", "Bing Xu"],
    year: 2014,
    venue: "NeurIPS",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/1406.2661",
  },
  {
    id: "p-scaling",
    slug: "scaling-laws-for-neural-language-models",
    title: "Scaling Laws for Neural Language Models",
    authors: ["Jared Kaplan", "Sam McCandlish", "Tom Henighan", "Tom B. Brown"],
    year: 2020,
    venue: "arXiv preprint",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2001.08361",
  },
  {
    id: "p-instructgpt",
    slug: "training-language-models-to-follow-instructions",
    title: "Training Language Models to Follow Instructions with Human Feedback",
    authors: ["Long Ouyang", "Jeff Wu", "Xu Jiang", "Diogo Almeida"],
    year: 2022,
    venue: "NeurIPS",
    field: "Natural language processing",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2203.02155",
  },
  {
    id: "p-sam",
    slug: "segment-anything",
    title: "Segment Anything",
    authors: ["Alexander Kirillov", "Eric Mintun", "Nikhila Ravi", "Hanzi Mao"],
    year: 2023,
    venue: "ICCV",
    field: "Computer vision",
    openAccess: true,
    sourceUrl: "https://arxiv.org/abs/2304.02643",
  },
  {
    id: "p-imagenet",
    slug: "imagenet-classification-deep-convolutional",
    title: "ImageNet Classification with Deep Convolutional Neural Networks",
    authors: ["Alex Krizhevsky", "Ilya Sutskever", "Geoffrey E. Hinton"],
    year: 2012,
    venue: "NeurIPS",
    field: "Computer vision",
    openAccess: true,
    sourceUrl: "https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html",
  },

  // ---- Genomics and biology ----------------------------------------------
  {
    id: "p-alphafold",
    slug: "highly-accurate-protein-structure-prediction",
    title: "Highly Accurate Protein Structure Prediction with AlphaFold",
    authors: ["John Jumper", "Richard Evans", "Alexander Pritzel", "Tim Green"],
    year: 2021,
    venue: "Nature",
    field: "Genomics",
    openAccess: true,
    sourceUrl: "https://www.nature.com/articles/s41586-021-03819-2",
  },
  {
    id: "p-crispr",
    slug: "programmable-dual-rna-guided-dna-endonuclease",
    title: "A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity",
    authors: ["Martin Jinek", "Krzysztof Chylinski", "Ines Fonfara", "Michael Hauer"],
    year: 2012,
    venue: "Science",
    field: "Genomics",
    openAccess: false,
    sourceUrl: "https://www.science.org/doi/10.1126/science.1225829",
  },
  {
    id: "p-humangenome",
    slug: "initial-sequencing-analysis-human-genome",
    title: "Initial Sequencing and Analysis of the Human Genome",
    authors: ["International Human Genome Sequencing Consortium"],
    year: 2001,
    venue: "Nature",
    field: "Genomics",
    openAccess: true,
    sourceUrl: "https://www.nature.com/articles/35057062",
  },
  {
    id: "p-tol",
    slug: "towards-a-natural-system-of-organisms",
    title: "Towards a Natural System of Organisms: Proposal for the Domains Archaea, Bacteria, and Eucarya",
    authors: ["Carl R. Woese", "Otto Kandler", "Mark L. Wheelis"],
    year: 1990,
    venue: "PNAS",
    field: "Ecology",
    openAccess: true,
    sourceUrl: "https://www.pnas.org/doi/10.1073/pnas.87.12.4576",
  },

  // ---- Clinical medicine --------------------------------------------------
  {
    id: "p-bnt162b2",
    slug: "safety-efficacy-bnt162b2-mrna-covid-19-vaccine",
    title: "Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine",
    authors: ["Fernando P. Polack", "Stephen J. Thomas", "Nicholas Kitchin", "Judith Absalon"],
    year: 2020,
    venue: "New England Journal of Medicine",
    field: "Clinical medicine",
    openAccess: true,
    sourceUrl: "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577",
  },
  {
    id: "p-recovery",
    slug: "dexamethasone-in-hospitalized-patients-with-covid-19",
    title: "Dexamethasone in Hospitalized Patients with Covid-19",
    authors: ["RECOVERY Collaborative Group"],
    year: 2021,
    venue: "New England Journal of Medicine",
    field: "Clinical medicine",
    openAccess: true,
    sourceUrl: "https://www.nejm.org/doi/full/10.1056/NEJMoa2021436",
  },
  {
    id: "p-sprint",
    slug: "intensive-vs-standard-blood-pressure-control",
    title: "A Randomized Trial of Intensive versus Standard Blood-Pressure Control",
    authors: ["SPRINT Research Group"],
    year: 2015,
    venue: "New England Journal of Medicine",
    field: "Clinical medicine",
    openAccess: true,
    sourceUrl: "https://www.nejm.org/doi/full/10.1056/NEJMoa1511939",
  },
  {
    id: "p-empareg",
    slug: "empagliflozin-cardiovascular-outcomes-mortality",
    title: "Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes",
    authors: ["Bernard Zinman", "Christoph Wanner", "John M. Lachin", "David Fitchett"],
    year: 2015,
    venue: "New England Journal of Medicine",
    field: "Clinical medicine",
    openAccess: true,
    sourceUrl: "https://www.nejm.org/doi/full/10.1056/NEJMoa1504720",
  },

  // ---- Neuroscience -------------------------------------------------------
  {
    id: "p-glymphatic",
    slug: "sleep-drives-metabolite-clearance-from-the-adult-brain",
    title: "Sleep Drives Metabolite Clearance from the Adult Brain",
    authors: ["Lulu Xie", "Hongyi Kang", "Qiwu Xu", "Michael J. Chen"],
    year: 2013,
    venue: "Science",
    field: "Neuroscience",
    openAccess: false,
    sourceUrl: "https://www.science.org/doi/10.1126/science.1241224",
  },
  {
    id: "p-gridcells",
    slug: "place-cells-grid-cells-spatial-representation",
    title: "Place Cells, Grid Cells, and the Brain's Spatial Representation System",
    authors: ["Edvard I. Moser", "Emilio Kropff", "May-Britt Moser"],
    year: 2008,
    venue: "Annual Review of Neuroscience",
    field: "Neuroscience",
    openAccess: false,
    sourceUrl: "https://www.annualreviews.org/doi/10.1146/annurev.neuro.31.061307.090723",
  },

  // ---- Climate ------------------------------------------------------------
  {
    id: "p-hothouse",
    slug: "trajectories-of-the-earth-system-in-the-anthropocene",
    title: "Trajectories of the Earth System in the Anthropocene",
    authors: ["Will Steffen", "Johan Rockström", "Katherine Richardson", "Timothy M. Lenton"],
    year: 2018,
    venue: "PNAS",
    field: "Climate science",
    openAccess: true,
    sourceUrl: "https://www.pnas.org/doi/10.1073/pnas.1810141115",
  },
  {
    id: "p-carbonbudget",
    slug: "global-carbon-budget-2023",
    title: "Global Carbon Budget 2023",
    authors: ["Pierre Friedlingstein", "Michael O'Sullivan", "Matthew W. Jones", "Robbie M. Andrew"],
    year: 2023,
    venue: "Earth System Science Data",
    field: "Climate science",
    openAccess: true,
    sourceUrl: "https://essd.copernicus.org/articles/15/5301/2023/",
  },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((p) => [p.id, p]));
export const CATALOG_BY_SLUG = new Map(CATALOG.map((p) => [p.slug, p]));
