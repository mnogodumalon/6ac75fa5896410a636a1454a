/**
 * Geburtstagseintrag erfassen — 5-Schritt-Wizard.
 * Steps: 1) Kirchengemeinde wählen → 2) Name, Anrede, Geburtsdatum → 3) Adresse → 4) Grußtext (optional) → 5) Prüfen & anlegen.
 * Reads: gemeindedaten. Writes: geburtstagsliste (via useGeburtstagseintragErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useGeburtstagseintragErfassenFlow } from '@/lib/journey/flows/GeburtstagseintragErfassen';
import { tx } from '@/i18n';

export default function GeburtstagseintragErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useGeburtstagseintragErfassenFlow({
    steps: {
      gemeinde: 1,
      anrede: 2, vorname: 2, nachname: 2, geburtsdatum: 2,
      strasse: 3, hausnummer: 3, postleitzahl: 3, ort: 3,
      persoenlicher_gruss: 4,
    },
    items: {
      gemeinde: r => ({ id: r.id, title: fieldText(r, 'gemeindename'), subtitle: fieldText(r, 'ort') }),
    },
  });
  const f = flow.forms.geburtstagsliste;

  return (
    <IntentWizardShell
      title={tx('Geburtstagseintrag erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Nimm eine Person mit Adresse und Geburtsdatum in die Geburtstagsliste auf.'),
        needs: [tx('Kirchengemeinde'), tx('Name und Geburtsdatum'), tx('Adresse der Person')],
      }}
    >
      <WizardStep label={tx('Kirchengemeinde')} description={tx('Zu welcher Kirchengemeinde gehört die Person?')}>
        <EntitySelectStep
          {...flow.picks.gemeinde.select}
          {...flow.pick('gemeinde')}
          searchPlaceholder={tx('Gemeinde oder Ort suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Person')} description={tx('Anrede, Name und Geburtsdatum eintragen.')} needs={['gemeinde']}>
        <div className="space-y-4">
          <Bound form={f} name="anrede" />
          <Bound form={f} name="vorname" />
          <Bound form={f} name="nachname" />
          <Bound form={f} name="geburtsdatum" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Adresse')} description={tx('Wohin soll die Geburtstagskarte gehen?')}>
        <div className="space-y-4">
          <Bound form={f} name="strasse" />
          <Bound form={f} name="hausnummer" />
          <Bound form={f} name="postleitzahl" />
          <Bound form={f} name="ort" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Grußtext')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Grußtext')} description={tx('Optional: einen persönlichen Gruß für die Karte schreiben.')}>
        <div className="space-y-4">
          <Bound
            form={f}
            name="persoenlicher_gruss"
            rows={5}
            hint={tx('Leer lassen, wenn der Standard-Grußtext der Gemeinde genügt.')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Person erscheint sofort in der Geburtstagsliste.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Gemeindedaten einrichten'), href: '#/intents/gemeindedaten-pflegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
