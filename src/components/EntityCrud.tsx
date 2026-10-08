/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'gemeindedaten'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.gemeindedaten.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.gemeindedaten.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.gemeindedaten.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.gemeindedaten              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   gemeindedaten: gemeindename, logo, strasse, hausnummer, postleitzahl, ort, standard_grusstext, unterschrift  ·  ← geburtstagsliste (list + contextual +)
 *   geburtstagsliste: anrede, vorname, nachname, geburtsdatum, strasse, hausnummer, postleitzahl, ort, …  ·  → gemeindedaten
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Gemeindedaten, Geburtstagsliste } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichGeburtstagsliste } from '@/lib/enrich';
import type { EnrichedGeburtstagsliste } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { GemeindedatenDialog, type GemeindedatenDialogDefaults } from '@/components/dialogs/GemeindedatenDialog';
import { GemeindedatenDetails } from '@/components/details/GemeindedatenDetails';
import { GeburtstagslisteDialog, type GeburtstagslisteDialogDefaults } from '@/components/dialogs/GeburtstagslisteDialog';
import { GeburtstagslisteDetails } from '@/components/details/GeburtstagslisteDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'gemeindedaten'; record: Gemeindedaten }
  | { type: 'geburtstagsliste'; record: EnrichedGeburtstagsliste };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  gemeindedaten: EntityCrudApi<Gemeindedaten, GemeindedatenDialogDefaults>;
  geburtstagsliste: EntityCrudApi<Geburtstagsliste, GeburtstagslisteDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { gemeindedaten: Gemeindedaten[]; geburtstagsliste: EnrichedGeburtstagsliste[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [gemeindedatenDialog, setGemeindedatenDialog] = useState<{ defaults?: GemeindedatenDialogDefaults; editing?: Gemeindedaten } | null>(null);
  const [geburtstagslisteDialog, setGeburtstagslisteDialog] = useState<{ defaults?: GeburtstagslisteDialogDefaults; editing?: Geburtstagsliste } | null>(null);
  const enrichedGeburtstagsliste = useMemo(() => enrichGeburtstagsliste(data.geburtstagsliste, { gemeindedatenMap: data.gemeindedatenMap }), [data.geburtstagsliste, data.gemeindedatenMap]);

  function detailGemeindedaten(record: Gemeindedaten, push = false) {
    const item: OverlayItem = { type: 'gemeindedaten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitGemeindedaten(fields: Gemeindedaten['fields']) {
    const editing = gemeindedatenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setGemeindedaten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateGemeindedatenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('gemeindedaten')} — ${t('crud_updated')}`, async () => {
        data.setGemeindedaten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateGemeindedatenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createGemeindedatenEntry(fields);
      undoToast(`${appLabel('gemeindedaten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailGeburtstagsliste(record: Geburtstagsliste, push = false) {
    const rec = enrichedGeburtstagsliste.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'geburtstagsliste', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitGeburtstagsliste(fields: Geburtstagsliste['fields']) {
    const editing = geburtstagslisteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setGeburtstagsliste(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateGeburtstagslisteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('geburtstagsliste')} — ${t('crud_updated')}`, async () => {
        data.setGeburtstagsliste(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateGeburtstagslisteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createGeburtstagslisteEntry(fields);
      undoToast(`${appLabel('geburtstagsliste')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <GemeindedatenDialog
        open={gemeindedatenDialog !== null}
        onClose={() => setGemeindedatenDialog(null)}
        onSubmit={submitGemeindedaten}
        defaultValues={gemeindedatenDialog?.defaults}
        recordId={gemeindedatenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Gemeindedaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Gemeindedaten']}
      />
      <GeburtstagslisteDialog
        open={geburtstagslisteDialog !== null}
        onClose={() => setGeburtstagslisteDialog(null)}
        onSubmit={submitGeburtstagsliste}
        defaultValues={geburtstagslisteDialog?.defaults}
        recordId={geburtstagslisteDialog?.editing?.record_id}
        gemeindedatenList={data.gemeindedaten}
        enablePhotoScan={AI_PHOTO_SCAN['Geburtstagsliste']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Geburtstagsliste']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'gemeindedaten') {
            return (
              <>
                <RecordHeader title={top.record.fields.gemeindename ?? appLabel('gemeindedaten')} subtitle={undefined} />
                <GemeindedatenDetails
                  record={top.record}
                  geburtstagslisteList={data.geburtstagsliste}
                  onOpenGeburtstagsliste={(r) => detailGeburtstagsliste(r, true)}
                  onAddGeburtstagsliste={perms.canWrite('geburtstagsliste') ? () => setGeburtstagslisteDialog({ defaults: { gemeinde: createRecordUrl(APP_IDS.GEMEINDEDATEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'geburtstagsliste') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('geburtstagsliste')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <GeburtstagslisteDetails
                  record={top.record}
                  gemeindedatenList={data.gemeindedaten}
                  onOpenGemeindedaten={(r) => detailGemeindedaten(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'gemeindedaten') return perms.canWrite('gemeindedaten');
          if (top.type === 'geburtstagsliste') return perms.canWrite('geburtstagsliste');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'gemeindedaten') setGemeindedatenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'geburtstagsliste') setGeburtstagslisteDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    gemeindedaten: {
      openCreate: (defaults?: GemeindedatenDialogDefaults) => (perms.canWrite('gemeindedaten') ? setGemeindedatenDialog({ defaults }) : refuse()),
      openEdit: (record: Gemeindedaten) => (perms.canWrite('gemeindedaten') ? setGemeindedatenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Gemeindedaten) => detailGemeindedaten(record, false),
      canWrite: perms.canWrite('gemeindedaten'),
    },
    geburtstagsliste: {
      openCreate: (defaults?: GeburtstagslisteDialogDefaults) => (perms.canWrite('geburtstagsliste') ? setGeburtstagslisteDialog({ defaults }) : refuse()),
      openEdit: (record: Geburtstagsliste) => (perms.canWrite('geburtstagsliste') ? setGeburtstagslisteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Geburtstagsliste) => detailGeburtstagsliste(record, false),
      canWrite: perms.canWrite('geburtstagsliste'),
    },
    enriched: { gemeindedaten: data.gemeindedaten, geburtstagsliste: enrichedGeburtstagsliste },
  };
}
