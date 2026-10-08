// Auto-generated. Per-entity form-enhancements config for "Geburtstagsliste".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["anrede", {"row": ["vorname", "nachname"], "cols": "1fr 1fr"}, "geburtsdatum", {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["postleitzahl", "ort"], "cols": "1fr 2fr"}, "gemeinde", "persoenlicher_gruss"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
