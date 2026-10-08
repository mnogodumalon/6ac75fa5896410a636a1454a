/**
 * Gemeindedaten einrichten — 4-Schritt-Wizard.
 * Steps: 1) Name und Anschrift → 2) Logo hochladen → 3) Grußtext und Unterschrift → 4) Prüfen & anlegen.
 * Reads: nichts. Writes: gemeindedaten (über useGemeindedatenPflegenFlow).
 * Composes: IntentWizardShell, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useGemeindedatenPflegenFlow } from '@/lib/journey/flows/GemeindedatenPflegen';
import { tx } from '@/i18n';

export default function GemeindedatenPflegenPage() {
  const [step, setStep] = useState(1);
  const flow = useGemeindedatenPflegenFlow({
    steps: {
      gemeindename: 1, strasse: 1, hausnummer: 1, postleitzahl: 1, ort: 1,
      logo: 2,
      standard_grusstext: 3, unterschrift: 3,
    },
  });
  const f = flow.forms.gemeindedaten;

  return (
    <IntentWizardShell
      title={tx('Gemeindedaten einrichten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Hinterlege deine Gemeinde, damit Karten und Aufkleber sie nutzen.'),
        needs: [tx('Name und Anschrift der Gemeinde'), tx('Das Logo als Datei'), tx('Dein Standard-Grußtext')],
      }}
    >
      <WizardStep label={tx('Anschrift')} description={tx('Wie heißt die Gemeinde und wo ist sie zu finden?')}>
        <div className="space-y-4">
          <Bound form={f} name="gemeindename" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><Bound form={f} name="strasse" /></div>
            <Bound form={f} name="hausnummer" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Bound form={f} name="postleitzahl" />
            <div className="sm:col-span-2"><Bound form={f} name="ort" /></div>
          </div>
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Logo')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Logo')} description={tx('Lade das Logo deiner Gemeinde hoch.')}>
        <div className="space-y-4">
          <Bound form={f} name="logo" />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Grußtext')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Grußtext')} description={tx('Was soll standardmäßig auf der Karte stehen?')}>
        <div className="space-y-4">
          <Bound form={f} name="standard_grusstext" rows={5} />
          <Bound form={f} name="unterschrift" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Karten und Aufkleber übernehmen diese Daten automatisch.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Jetzt kannst du die ersten Geburtstage erfassen.')}
          next={[
            { label: tx('Geburtstagseintrag erfassen'), href: '#/intents/geburtstagseintrag-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
