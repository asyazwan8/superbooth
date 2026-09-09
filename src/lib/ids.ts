import { customAlphabet, nanoid } from "nanoid";

/**
 * Short ids appear in the QR code, so the alphabet omits characters that are
 * easy to misread or mistype when someone gives up on the camera and types the
 * link by hand: 0/O, 1/I/l, and the vowels that let it spell something rude.
 */
const SHORT_ALPHABET = "23456789bcdfghjkmnpqrstvwxz";
const SHORT_LENGTH = 8;

const shortIdGenerator = customAlphabet(SHORT_ALPHABET, SHORT_LENGTH);

/** ~27^8 ≈ 2.8e11 combinations: ample for events, and short enough for a dense QR. */
export const newShortId = (): string => shortIdGenerator();

export const newSessionId = (): string => nanoid(16);

export const newOptionId = (prefix: string): string => `${prefix}-${nanoid(8)}`;

export const newThemeId = (): string => newOptionId("theme");

export const newCustomisationId = (): string => newOptionId("custom");

export const newPresetId = (): string => `preset-${nanoid(10)}`;
