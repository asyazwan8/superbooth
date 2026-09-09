import { newCustomisationId, newOptionId, newThemeId } from "@/lib/ids";
import type { Customisation, Theme } from "@/lib/schema";

/**
 * The prompt builder behind the backend's "build from a theme name".
 *
 * An operator setting up an event should be able to type "Cyberpunk" and get a
 * working theme, not a blank textarea and the job of remembering that a prompt
 * needs a render style, a setting, a wardrobe and a light source before it
 * produces anything usable twice in a row. So the builder is a template, and
 * the four shipped themes are the same template with their sections written
 * out — typing "80s" in the backend reproduces exactly what the booth ships
 * with, which is what makes the feature trustworthy rather than magic.
 *
 * Deterministic on purpose. Generating this text with a model would cost money
 * per edit, would not survive `FAL_MOCK=1`, and would give a different answer
 * every time an operator pressed the button on the same name.
 */

/** How a theme is rendered. Chosen from the name, overridable by the operator. */
export type LookFamily = "photographic" | "retro" | "illustrated" | "comic";

interface Look {
  /** The rendering instruction — the first thing the model reads. */
  style: string;
  /** Light and grade, which is what makes two themes look like one booth. */
  finish: string;
}

const LOOKS: Record<LookFamily, Look> = {
  photographic: {
    style:
      "A photographic portrait with crisp medium-format detail and a refined, natural colour grade.",
    finish:
      "Controlled lighting with a soft key and a subtle rim separating the subject from the background.",
  },
  retro: {
    style:
      "A period photograph on warm analogue film: visible grain, soft diffusion glow around the " +
      "highlights, gentle halation and the slightly soft focus of a vintage portrait lens.",
    finish: "Saturated magenta and teal grade, practical lights flaring in shot.",
  },
  illustrated: {
    style:
      "A hand-drawn character illustration: clean confident linework, flat cel-shaded colour with " +
      "two-tone shadows and a vibrant limited palette. Stylised but anatomically faithful.",
    finish: "Graphic block shadows and a subtle paper grain over the whole frame.",
  },
  comic: {
    style:
      "A comic-book illustration: bold inked outlines, dramatic cel shading, halftone dot texture " +
      "in the midtones and saturated primary colour.",
    finish: "Hard heroic key light from below the horizon, with a bright rim along the shoulders.",
  },
};

/** Keywords that pick a look when the operator does not. */
const LOOK_HINTS: [LookFamily, RegExp][] = [
  ["comic", /\b(comic|superhero|hero|marvel|manga|anime)\b/i],
  ["retro", /\b(80s|90s|70s|retro|vintage|synthwave|disco|nostalgi\w*)\b/i],
  ["illustrated", /\b(2d|cartoon|illustrat\w*|animated|toon|pixar)\b/i],
];

export function detectLook(name: string): LookFamily {
  const match = LOOK_HINTS.find(([, pattern]) => pattern.test(name));
  return match ? match[0] : "photographic";
}

interface Recipe {
  look: LookFamily;
  /** Where the portrait happens. */
  setting: string;
  /** What the subject is wearing before any customisation refines it. */
  wardrobe: string;
  /** The customisation slots this theme opens with. */
  slots: SlotSeed[];
}

interface SlotSeed {
  label: string;
  title: string;
  subtitle: string;
  options: { label: string; prompt: string }[];
}

/* ------------------------------------------------------------------ */
/* Shipped recipes                                                     */
/* ------------------------------------------------------------------ */

const OUTFIT_TITLE = "Pick your outfit";
const ACCESSORY_TITLE = "Add an accessory";
const BACKDROP_TITLE = "Pick your backdrop";

const RECIPES: Record<string, Recipe> = {
  "80s": {
    look: "retro",
    setting:
      "A neon-lit 1980s arcade at night: cabinet screens glowing behind the subject, chrome trim, " +
      "a wet-look floor catching magenta and cyan light.",
    wardrobe: "Bold period casualwear with strong shoulders and saturated block colour.",
    slots: [
      {
        label: "Outfit",
        title: OUTFIT_TITLE,
        subtitle: "What are you wearing?",
        options: [
          { label: "Windbreaker", prompt: "An oversized colour-blocked windbreaker over a plain tee, high-waisted jeans and white hi-tops." },
          { label: "Power suit", prompt: "A boxy pastel power suit with padded shoulders and rolled sleeves." },
          { label: "Denim", prompt: "A double-denim jacket and jeans with band pins on the lapel." },
          { label: "Tracksuit", prompt: "A shell tracksuit in primary colours with contrast piping and white trainers." },
        ],
      },
      {
        label: "Accessory",
        title: ACCESSORY_TITLE,
        subtitle: "One finishing touch.",
        options: [
          { label: "Shades", prompt: "Oversized angular sunglasses pushed up into the hair." },
          { label: "Headphones", prompt: "Chunky foam-padded headphones worn around the neck." },
          { label: "Boombox", prompt: "A large chrome boombox carried at the hip." },
          { label: "Skateboard", prompt: "A period skateboard held upright at the subject's side." },
        ],
      },
      {
        label: "Backdrop",
        title: BACKDROP_TITLE,
        subtitle: "Where does this happen?",
        options: [
          { label: "Arcade", prompt: "Rows of glowing arcade cabinets receding behind the subject." },
          { label: "Roller rink", prompt: "A roller rink under a mirrorball, light streaking across the floor." },
          { label: "Strip mall", prompt: "A neon strip-mall frontage at dusk, signage buzzing overhead." },
          { label: "Grid sunset", prompt: "A synthwave horizon: a wireframe grid running to a low chrome sun." },
        ],
      },
    ],
  },

  cyberpunk: {
    look: "photographic",
    setting:
      "A dense high-tech back alley at night: holographic advertising, tangled cabling and steam, " +
      "lit in electric violet and acid green with hard rim light.",
    wardrobe: "Layered techwear with utility straps and thin glowing trim.",
    slots: [
      {
        label: "Outfit",
        title: OUTFIT_TITLE,
        subtitle: "What are you wearing?",
        options: [
          { label: "Techwear coat", prompt: "A long technical coat with utility straps, magnetic clasps and luminous piping." },
          { label: "Street armour", prompt: "A cropped armoured jacket over a mesh underlayer, reinforced at the shoulders." },
          { label: "Corp suit", prompt: "A sharp matte-black corporate suit with a high collar and a subtle circuit weave." },
          { label: "Netrunner", prompt: "A light hooded shell covered in soft displays, cables running into the sleeves." },
        ],
      },
      {
        label: "Accessory",
        title: ACCESSORY_TITLE,
        subtitle: "One finishing touch.",
        options: [
          { label: "Visor", prompt: "A slim wraparound visor projecting faint data across the eyes." },
          { label: "Neural port", prompt: "Understated chrome cybernetic plating at the temple and collarbone." },
          { label: "Drone", prompt: "A palm-sized drone hovering at the subject's shoulder, casting its own light." },
          { label: "Umbrella", prompt: "A transparent umbrella with an illuminated rim, held over one shoulder." },
        ],
      },
      {
        label: "Backdrop",
        title: BACKDROP_TITLE,
        subtitle: "Where does this happen?",
        options: [
          { label: "Back alley", prompt: "A rain-slicked alley crowded with holographic signage and vent steam." },
          { label: "Night market", prompt: "A covered night market of food stalls under a canopy of cables and screens." },
          { label: "Rooftop", prompt: "A rooftop above the traffic layer, megastructures glowing into the haze." },
          { label: "Server hall", prompt: "A cold server hall, racks receding into the dark with indicator lights." },
        ],
      },
    ],
  },

  "jungle ranger": {
    look: "photographic",
    setting:
      "Deep rainforest at midday: broad wet leaves, hanging vines and shafts of sunlight cutting " +
      "through the canopy, rich greens with warm highlights.",
    wardrobe: "A rugged field outfit built for humidity, worn but well kept.",
    slots: [
      {
        label: "Outfit",
        title: OUTFIT_TITLE,
        subtitle: "What are you wearing?",
        options: [
          { label: "Field khakis", prompt: "A canvas field shirt with rolled sleeves, cargo trousers and worn leather boots." },
          { label: "Poncho", prompt: "An oiled rain poncho over a technical base layer, hood down." },
          { label: "Expedition vest", prompt: "A multi-pocket expedition vest over a faded tee, with a bandana at the neck." },
          { label: "Tracker", prompt: "Lightweight muted layers with a wide-brimmed hat and forearm wraps." },
        ],
      },
      {
        label: "Accessory",
        title: ACCESSORY_TITLE,
        subtitle: "One finishing touch.",
        options: [
          { label: "Binoculars", prompt: "Field binoculars hanging at the chest on a worn strap." },
          { label: "Machete", prompt: "A sheathed machete on the hip, hand resting on the handle." },
          { label: "Backpack", prompt: "A loaded canvas expedition backpack with a bedroll strapped on top." },
          { label: "Parrot", prompt: "A brightly coloured macaw perched on the subject's shoulder." },
        ],
      },
      {
        label: "Backdrop",
        title: BACKDROP_TITLE,
        subtitle: "Where does this happen?",
        options: [
          { label: "Canopy", prompt: "A rope bridge high in the canopy, light breaking through the leaves." },
          { label: "Waterfall", prompt: "A waterfall plunging into a pool, spray hanging in the air." },
          { label: "Ruins", prompt: "Vine-covered stone ruins half swallowed by the forest." },
          { label: "River camp", prompt: "A riverbank camp at golden hour, a canoe drawn up on the mud." },
        ],
      },
    ],
  },

  "superhero comicbook": {
    look: "comic",
    setting:
      "A city skyline at dusk seen from rooftop height, dramatic clouds behind the subject and the " +
      "streets glowing far below.",
    wardrobe:
      "An original superhero costume with a sculpted chest emblem, gauntlets and a cape catching " +
      "the wind. Not any existing or trademarked character.",
    slots: [
      {
        label: "Suit",
        title: "Pick your suit",
        subtitle: "Every hero needs one.",
        options: [
          { label: "Classic", prompt: "A bold primary-colour suit with a belt, gauntlets and a long cape." },
          { label: "Armoured", prompt: "A plated armoured suit with segmented panels and a glowing chest core." },
          { label: "Stealth", prompt: "A matte dark suit with a hooded cowl and thin luminous seams." },
          { label: "Cosmic", prompt: "A star-flecked suit with a flowing mantle and a metallic collar." },
        ],
      },
      {
        label: "Superpower",
        title: "Choose your power",
        subtitle: "What are you capable of?",
        options: [
          { label: "Fire", prompt: "Flame wreathing the hands and forearms, embers rising through the frame." },
          { label: "Lightning", prompt: "Arcs of electricity crackling around the fists and along the shoulders." },
          { label: "Ice", prompt: "Frost spreading from the hands, crystals forming in the air nearby." },
          { label: "Flight", prompt: "Caught mid-hover with the cape streaming, feet clear of the ground." },
        ],
      },
      {
        label: "Accessory",
        title: ACCESSORY_TITLE,
        subtitle: "One finishing touch.",
        options: [
          { label: "Mask", prompt: "A sculpted domino mask matching the suit." },
          { label: "Shield", prompt: "A heavy emblazoned shield held at the side." },
          { label: "Gauntlets", prompt: "Oversized power gauntlets glowing at the knuckles." },
          { label: "Sidekick pet", prompt: "A small animal companion in matching colours at the subject's feet." },
        ],
      },
      {
        label: "Backdrop",
        title: BACKDROP_TITLE,
        subtitle: "Where does this happen?",
        options: [
          { label: "Rooftop", prompt: "A rooftop ledge above the city at dusk, cape lifting in the wind." },
          { label: "Street level", prompt: "A city street mid-action, debris and dust suspended around the subject." },
          { label: "Sky", prompt: "High above the clouds with the city a grid of light far below." },
          { label: "Hall of heroes", prompt: "A vast hall of statues and banners, light falling from high windows." },
        ],
      },
    ],
  },
};

/** The scaffold used for a name with no recipe. */
function genericRecipe(name: string, look: LookFamily): Recipe {
  return {
    look,
    setting: `A setting that reads unmistakably as ${name}, with depth behind the subject.`,
    wardrobe: `An outfit that belongs in a ${name} world, in keeping with the setting.`,
    slots: [
      {
        label: "Outfit",
        title: OUTFIT_TITLE,
        subtitle: "What are you wearing?",
        options: [{ label: "Option one", prompt: `An outfit that suits a ${name} portrait.` }],
      },
      {
        label: "Accessory",
        title: ACCESSORY_TITLE,
        subtitle: "One finishing touch.",
        options: [{ label: "Option one", prompt: `An accessory that suits a ${name} portrait.` }],
      },
      {
        label: "Backdrop",
        title: BACKDROP_TITLE,
        subtitle: "Where does this happen?",
        options: [{ label: "Option one", prompt: `A backdrop that suits a ${name} portrait.` }],
      },
    ],
  };
}

function recipeFor(name: string, look?: LookFamily): Recipe {
  const key = name.trim().toLowerCase();
  const known = RECIPES[key];
  if (known) return look && look !== known.look ? { ...known, look } : known;
  return genericRecipe(name.trim(), look ?? detectLook(name));
}

/* ------------------------------------------------------------------ */
/* The builder                                                         */
/* ------------------------------------------------------------------ */

/**
 * The theme's prompt fragment: render style, setting, wardrobe and finish, in
 * that order. Identity, framing and the guards are the generation prompt's
 * job — they are the same for every theme and belong in one place, not copied
 * into each one where an operator can edit them away by accident.
 */
export function composeThemePrompt(name: string, look?: LookFamily): string {
  const recipe = recipeFor(name, look);
  const chosen = LOOKS[recipe.look];
  return [
    chosen.style,
    `SETTING — ${recipe.setting}`,
    `WARDROBE — ${recipe.wardrobe}`,
    chosen.finish,
  ].join(" ");
}

/** The slots the theme opens with, ready to edit. */
export function composeCustomisations(name: string, look?: LookFamily): Customisation[] {
  return recipeFor(name, look).slots.map((slot) => ({
    id: newCustomisationId(),
    label: slot.label,
    title: slot.title,
    subtitle: slot.subtitle,
    enabled: true,
    options: slot.options.map((option) => ({
      id: newOptionId("opt"),
      label: option.label,
      prompt: option.prompt,
      imageUrl: null,
      useAsReference: false,
      enabled: true,
    })),
  }));
}

/** A whole theme from a name — what the backend's build button produces. */
export function buildTheme(name: string, look?: LookFamily): Theme {
  const label = name.trim();
  return {
    id: newThemeId(),
    label,
    prompt: composeThemePrompt(label, look),
    imageUrl: null,
    useAsReference: false,
    enabled: true,
    customisations: composeCustomisations(label, look),
  };
}

/** Names the builder has a written recipe for, for the backend's hints. */
export const KNOWN_THEMES = Object.keys(RECIPES);
