import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import { IconAlertTriangle, IconCake, IconPlus, IconMapPinOff, IconCalendarWeek, IconCalendarMonth } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedGeburtstagsliste } from '@/types/enriched';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';

type Range = 'all' | 'week' | 'month' | 'noaddress';

interface Upcoming {
  rec: EnrichedGeburtstagsliste;
  next: Date;
  days: number;
  age: number | null;
  name: string;
}

// Feb 29 in a non-leap year lands on Feb 28 instead of rolling into March.
function occurrence(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  return d.getMonth() !== month ? new Date(year, month + 1, 0) : d;
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { gemeindedaten } = data;
  const crud = useEntityCrud(data);
  const liste = crud.enriched.geburtstagsliste;
  const clock = useClock();
  const [range, setRange] = useState<Range>('all');

  const today = startOfDay(clock);
  const todayKey = format(today, 'yyyy-MM-dd');

  const personName = (r: EnrichedGeburtstagsliste) =>
    [r.fields.vorname, r.fields.nachname].filter(Boolean).join(' ') || tx('Ohne Namen');

  const upcoming: Upcoming[] = useMemo(() => {
    const out: Upcoming[] = [];
    for (const rec of liste) {
      const g = rec.fields.geburtsdatum;
      if (!g) continue;
      let birth: Date;
      try { birth = parseISO(g); } catch { continue; }
      if (isNaN(birth.getTime())) continue;
      let next = occurrence(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (next < today) next = occurrence(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
      const age = next.getFullYear() - birth.getFullYear();
      out.push({
        rec, next, age: age > 0 && age < 130 ? age : null,
        days: differenceInCalendarDays(next, today),
        name: [rec.fields.vorname, rec.fields.nachname].filter(Boolean).join(' '),
      });
    }
    return out.sort((a, b) => a.days - b.days);
    // todayKey changes once a day — enough to re-derive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, todayKey]);

  const week = upcoming.filter(u => u.days <= 7);
  const month = upcoming.filter(u => u.days <= 30);
  const noAddress = liste.filter(r => !r.fields.strasse || !r.fields.postleitzahl || !r.fields.ort);
  const heute = upcoming.filter(u => u.days === 0);

  const events: CalendarEvent[] = useMemo(() => {
    const ev: CalendarEvent[] = [];
    const y = today.getFullYear();
    for (const rec of liste) {
      const g = rec.fields.geburtsdatum;
      if (!g) continue;
      const birth = parseISO(g);
      if (isNaN(birth.getTime())) continue;
      for (const year of [y - 1, y, y + 1]) {
        const d = occurrence(year, birth.getMonth(), birth.getDate());
        const age = year - birth.getFullYear();
        ev.push({
          id: `geburtstag:${rec.record_id}:${year}`,
          start: format(d, 'yyyy-MM-dd'),
          allDay: true,
          title: [rec.fields.vorname, rec.fields.nachname].filter(Boolean).join(' ') || '—',
          subtitle: age > 0 && age < 130 ? tx`${age}. Geburtstag` : undefined,
          tone: !rec.fields.strasse || !rec.fields.postleitzahl || !rec.fields.ort ? 'warning' : 'primary',
        });
      }
    }
    return ev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, todayKey]);

  const gemeinde = gemeindedaten[0];
  const gemeindeFehlt = !gemeinde || !gemeinde.fields.logo || !gemeinde.fields.standard_grusstext || !gemeinde.fields.unterschrift;
  const missing = !gemeinde
    ? []
    : [
        !gemeinde.fields.logo && tx('Logo'),
        !gemeinde.fields.standard_grusstext && tx('Grußtext'),
        !gemeinde.fields.unterschrift && tx('Unterschrift'),
      ].filter(Boolean) as string[];

  const openGemeinde = () => {
    if (gemeinde) crud.gemeindedaten.openEdit(gemeinde);
    else crud.gemeindedaten.openCreate({});
  };

  const openPerson = (id: string) => {
    const rec = data.geburtstagsliste.find(r => r.record_id === id);
    if (rec) crud.geburtstagsliste.openDetail(rec);
  };

  const editPerson = (id: string) => {
    const rec = data.geburtstagsliste.find(r => r.record_id === id);
    if (rec) crud.geburtstagsliste.openEdit(rec);
  };

  const dayLabel = (u: Upcoming) =>
    u.days === 0 ? tx('Heute') : u.days === 1 ? tx('Morgen') : tx`in ${u.days} Tagen`;

  const context = (() => {
    if (liste.length === 0) return tx('Lege deine Geburtstagsliste an, dann entstehen Karten und Aufkleber.');
    if (heute.length > 0) {
      const names = namen(heute.map(u => u.rec.fields.vorname ?? u.name));
      return tx`Heute hat ${names} Geburtstag.`;
    }
    if (upcoming.length > 0) {
      const n = upcoming[0];
      return tx`Als Nächstes feiert ${n.name || tx('jemand')} am ${format(n.next, 'dd.MM.', { locale: dateFnsLocale() })} Geburtstag.`;
    }
    return tx('Noch keine Geburtsdaten in der Liste.');
  })();

  const listItems = (range === 'noaddress'
    ? noAddress.map(r => ({ r, u: upcoming.find(x => x.rec.record_id === r.record_id) }))
    : (range === 'week' ? week : range === 'month' ? month : upcoming.slice(0, 40)).map(u => ({ r: u.rec, u }))
  ).map(({ r, u }) => ({
    id: r.record_id,
    title: personName(r),
    secondLine: u ? (
      <>
        <span className={u.days <= 7 ? 'font-medium text-primary' : 'font-medium'}>{dayLabel(u)}</span>
        <span className="text-muted-foreground"> · {formatDate(format(u.next, 'yyyy-MM-dd'))}{u.age ? ` · ${u.age}` : ''}</span>
      </>
    ) : (
      <span className="text-muted-foreground">{tx('Kein Geburtsdatum')}</span>
    ),
    action: { label: tx('Bearbeiten'), onClick: () => editPerson(r.record_id) },
  }));

  const listTitle =
    range === 'week' ? tx('Geburtstage diese Woche')
    : range === 'month' ? tx('Geburtstage in 30 Tagen')
    : range === 'noaddress' ? tx('Adresse unvollständig')
    : tx('Anstehende Geburtstage');

  const toggle = (r: Range) => setRange(cur => (cur === r ? 'all' : r));

  const recentlyAdded = [...liste]
    .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
    .slice(0, 5)
    .map(r => ({
      id: r.record_id,
      title: personName(r),
      secondLine: <span className="text-muted-foreground">{tx('Hinzugefügt')} {formatDate(r.createdat)}</span>,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{context}</p>
        </div>
        {crud.geburtstagsliste.canWrite && (
          <Button onClick={() => crud.geburtstagsliste.openCreate({})} className="shrink-0">
            <IconPlus size={16} className="shrink-0" />
            {tx('Person hinzufügen')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="split"
        hero={
          gemeindeFehlt && crud.gemeindedaten.canWrite ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: gemeinde ? tx('Gemeindedaten ergänzen') : tx('Gemeindedaten anlegen'),
                onClick: openGemeinde,
              }}
            >
              {gemeinde
                ? tx`Für Karte und Aufkleber fehlen noch: ${missing.join(', ')}.`
                : tx('Hinterlege zuerst Logo, Grußtext und Unterschrift deiner Kirchengemeinde.')}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatCardRow>
            <StatCard
              title={tx('Diese Woche')}
              value={week.length}
              description={week.length > 0 ? namen(week.map(u => u.rec.fields.vorname ?? u.name)) : tx('Keine Geburtstage in 7 Tagen')}
              icon={<IconCalendarWeek size={18} className="text-muted-foreground" />}
              tone={week.length > 0 ? 'primary' : 'default'}
              onClick={() => toggle('week')}
              active={range === 'week'}
            />
            <StatCard
              title={tx('In 30 Tagen')}
              value={month.length}
              description={month.length > 0 ? tx`${liste.length} Einträge in der Liste` : tx('Nichts in Sicht')}
              icon={<IconCalendarMonth size={18} className="text-muted-foreground" />}
              onClick={() => toggle('month')}
              active={range === 'month'}
            />
            <StatCard
              title={tx('Adresse fehlt')}
              value={noAddress.length}
              description={noAddress.length > 0 ? tx('Für Aufkleber ergänzen') : tx('Alle Adressen vollständig')}
              icon={<IconMapPinOff size={18} className="text-muted-foreground" />}
              tone={noAddress.length > 0 ? 'warning' : 'default'}
              onClick={() => toggle('noaddress')}
              active={range === 'noaddress'}
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title={listTitle}
              items={listItems}
              max={6}
              onItemClick={openPerson}
              empty={{
                text: liste.length === 0 ? tx('Noch keine Personen in der Liste.') : tx('Keine Einträge in dieser Auswahl.'),
                action: crud.geburtstagsliste.canWrite
                  ? { label: tx('Person hinzufügen'), onClick: () => crud.geburtstagsliste.openCreate({}) }
                  : undefined,
              }}
            />
            <WorkList
              title={tx('Zuletzt hinzugefügt')}
              items={recentlyAdded}
              max={5}
              onItemClick={openPerson}
              empty={{ text: tx('Noch nichts hinzugefügt.') }}
            />
          </>
        }
        primary={
          <CalendarWidget
            events={events}
            defaultView="month"
            locale={dateFnsLocale()}
            onEventClick={ev => openPerson(ev.id.split(':')[1] ?? '')}
            onEmptyClick={crud.geburtstagsliste.canWrite
              ? d => crud.geburtstagsliste.openCreate({ geburtsdatum: format(d, 'yyyy-MM-dd') })
              : undefined}
          />
        }
      />
      {crud.surfaces}
    </div>
  );
}
