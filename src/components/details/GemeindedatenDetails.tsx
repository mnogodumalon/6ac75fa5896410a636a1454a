import type { Gemeindedaten, Geburtstagsliste } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface GemeindedatenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Gemeindedaten;
  /** 1:N „Geburtstagsliste" (gemeinde): VOLLE Liste — der Block filtert auf diesen Record. */
  geburtstagslisteList: Geburtstagsliste[];
  /** Zeilen-Klick → overlay.push auf das Geburtstagsliste-Detail (nie der Edit-Dialog). */
  onOpenGeburtstagsliste: (record: Geburtstagsliste) => void;
  /** Kontextuelles „+": öffnet den Geburtstagsliste-Dialog mit diesem Record vorgesetzt. */
  onAddGeburtstagsliste?: () => void;
}

export function GemeindedatenDetails({
  record,
  geburtstagslisteList,
  onOpenGeburtstagsliste,
  onAddGeburtstagsliste,
}: GemeindedatenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('gemeindedaten', 'gemeindename')} value={record.fields.gemeindename} format="text" />
        <RecordField label={fieldLabel('gemeindedaten', 'logo')} className="md:col-span-2">
          {record.fields.logo ? (
            <MediaThumbnail src={record.fields.logo as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('gemeindedaten', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('gemeindedaten', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('gemeindedaten', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
        <RecordField label={fieldLabel('gemeindedaten', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('gemeindedaten', 'standard_grusstext')} value={record.fields.standard_grusstext} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('gemeindedaten', 'unterschrift')} value={record.fields.unterschrift} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('geburtstagsliste')}
        items={geburtstagslisteList.filter(r => extractRecordId(r.fields.gemeinde) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? appLabel('geburtstagsliste'), meta: r.fields.geburtsdatum })}
        onOpen={onOpenGeburtstagsliste}
        onAdd={onAddGeburtstagsliste}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.GEMEINDEDATEN} recordId={record.record_id} readOnly={!perms.canWrite('gemeindedaten')} />
    </>
  );
}
