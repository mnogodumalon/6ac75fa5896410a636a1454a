import type { Geburtstagsliste } from './app';

export type EnrichedGeburtstagsliste = Geburtstagsliste & {
  gemeindeName: string;
};
