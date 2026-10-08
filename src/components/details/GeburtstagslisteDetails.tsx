import type { Geburtstagsliste, Gemeindedaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface GeburtstagslisteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Geburtstagsliste;
  /** N:1-Ziel „Gemeindedaten": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  gemeindedatenList: Gemeindedaten[];
  /** Klick auf die Gemeindedaten-Relation → overlay.push auf dessen Detail. */
  onOpenGemeindedaten?: (record: Gemeindedaten) => void;
}

export function GeburtstagslisteDetails({
  record,
  gemeindedatenList,
  onOpenGemeindedaten,
}: GeburtstagslisteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gemeindeTarget = gemeindedatenList.find(r => r.record_id === extractRecordId(record.fields.gemeinde));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('geburtstagsliste', 'anrede')} value={record.fields.anrede} format="pill" />
        <RecordField label={fieldLabel('geburtstagsliste', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('geburtstagsliste', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('geburtstagsliste', 'persoenlicher_gruss')} value={record.fields.persoenlicher_gruss} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('geburtstagsliste', 'gemeinde')}
          name={gemeindeTarget?.fields.gemeindename ?? '—'}
          meta={[gemeindeTarget?.fields.strasse, gemeindeTarget?.fields.hausnummer].filter(Boolean).join(' · ') || undefined}
          onClick={gemeindeTarget && onOpenGemeindedaten ? () => onOpenGemeindedaten!(gemeindeTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.GEBURTSTAGSLISTE} recordId={record.record_id} readOnly={!perms.canWrite('geburtstagsliste')} />
    </>
  );
}
