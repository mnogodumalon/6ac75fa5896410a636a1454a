import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Gemeindedaten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    gemeindename?: string;
    logo?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    ort?: string;
    standard_grusstext?: string;
    unterschrift?: string;
  };
}

export interface Geburtstagsliste {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    anrede?: LookupValue;
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    ort?: string;
    gemeinde?: RecordUrl; // applookup -> URL zu 'Gemeindedaten' Record
    persoenlicher_gruss?: string;
  };
}

export const APP_IDS = {
  GEMEINDEDATEN: '6ac75f90524e1594a9bb08ff',
  GEBURTSTAGSLISTE: '6ac75f934694af9171a4b12e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'geburtstagsliste': {
    anrede: [{ key: "frau", get label() { return lookupLabel('geburtstagsliste', 'anrede', "frau") ?? "Frau"; } }, { key: "herr", get label() { return lookupLabel('geburtstagsliste', 'anrede', "herr") ?? "Herr"; } }, { key: "familie", get label() { return lookupLabel('geburtstagsliste', 'anrede', "familie") ?? "Familie"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'gemeindedaten': {
    'gemeindename': 'string/text',
    'logo': 'file',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'standard_grusstext': 'string/textarea',
    'unterschrift': 'string/text',
  },
  'geburtstagsliste': {
    'anrede': 'lookup/select',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'ort': 'string/text',
    'gemeinde': 'applookup/select',
    'persoenlicher_gruss': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateGemeindedaten = StripLookup<Gemeindedaten['fields']>;
export type CreateGeburtstagsliste = StripLookup<Geburtstagsliste['fields']>;