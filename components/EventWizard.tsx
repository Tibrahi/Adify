'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/actions';
import type { CountryInfo } from '@/lib/countries';
import { eventPriceMinor } from '@/lib/dates';
import { EVENT_CATEGORIES, type DbEvent } from '@/lib/types';
import { CurrencySelect } from './CurrencySelect';
import { Icon } from './Icon';

const initial: ActionResult = { ok: false };

export const AFRICA_TIMEZONES = [
  'UTC',
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Bamako',
  'Africa/Bangui', 'Africa/Banjul', 'Africa/Bissau', 'Africa/Brazzaville', 'Africa/Cairo',
  'Africa/Casablanca', 'Africa/Conakry', 'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Douala',
  'Africa/Freetown', 'Africa/Harare', 'Africa/Johannesburg', 'Africa/Juba', 'Africa/Kampala',
  'Africa/Khartoum', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Lagos', 'Africa/Libreville',
  'Africa/Lome', 'Africa/Luanda', 'Africa/Lusaka', 'Africa/Maputo', 'Africa/Monrovia',
  'Africa/Nairobi', 'Africa/Ndjamena', 'Africa/Niamey', 'Africa/Nouakchott', 'Africa/Ouagadougou',
  'Africa/Porto-Novo', 'Africa/Tripoli', 'Africa/Tunis',
];

const STEPS = ['Basic info', 'Schedule', 'Attendance', 'Venue / Online', 'Reservations', 'Policies', 'Preview'];

type Runner = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const inputCls =
  'min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm placeholder:text-adify-muted';
const labelCls = 'mb-1 block text-sm font-medium';
const req = (
  <span aria-hidden className="text-adify-error">
    *
  </span>
);

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-adify-error">
      {message}
    </p>
  );
}

interface DraftItem {
  key: string;
  a: string;
  b: string;
}

let keyCounter = 0;
function nextKey(prefix: string): string {
  keyCounter += 1;
  return `${prefix}${keyCounter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function readDraft(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem('adify:event:draft');
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function EventWizard({
  mode,
  initialEvent,
  initialSchedule,
  countries,
  run,
}: {
  mode: 'create' | 'edit';
  initialEvent?: DbEvent;
  initialSchedule?: { startDate: string; startTime: string; endDate: string; endTime: string; deadlineDate: string; deadlineTime: string };
  countries: CountryInfo[];
  run: Runner;
}) {
  const e = initialEvent;
  const [state, formAction, pending] = useActionState(run, initial);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<Record<string, string> | null>(null);

  const [attendance, setAttendance] = useState(e?.attendance ?? 'physical');
  const [pricing, setPricing] = useState(e?.pricing ?? 'free');
  const [capacityType, setCapacityType] = useState(e?.capacityType ?? 'limited');
  const [program, setProgram] = useState<DraftItem[]>(
    () => e?.programItems.map((p) => ({ key: p.id, a: p.title, b: p.detail })) ?? [],
  );
  const [contacts, setContacts] = useState<DraftItem[]>(
    () => e?.extraContacts.map((c) => ({ key: c.id, a: c.name, b: c.detail })) ?? [],
  );

  const fe = useMemo(() => state.fieldErrors ?? {}, [state]);
  const needsPhysical = attendance === 'physical' || attendance === 'hybrid';
  const needsOnline = attendance === 'online' || attendance === 'hybrid';

  useEffect(() => {
    if (state.ok && state.redirect) {
      if (mode === 'create') {
        try {
          localStorage.removeItem('adify:event:draft');
        } catch {
          // ignore
        }
      }
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router, mode]);

  // Draft recovery for new listings (create mode only).
  useEffect(() => {
    if (mode !== 'create' || !formRef.current) return;
    const saved = readDraft();
    if (!saved) return;
    const form = formRef.current;
    for (const [name, value] of Object.entries(saved)) {
      // Controlled radios restore through state below, not the DOM.
      if (name === 'attendance' || name === 'pricing' || name === 'capacityType') continue;
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!el || (el instanceof HTMLInputElement && el.type === 'file')) continue;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        el.checked = value === 'on';
      } else {
        el.value = value;
      }
    }
    /* eslint-disable react-hooks/set-state-in-effect -- mount-only restore from
       localStorage (external system). Lazy useState init would read storage
       during SSR and cause hydration mismatch. */
    if (saved.attendance === 'physical' || saved.attendance === 'online' || saved.attendance === 'hybrid') {
      setAttendance(saved.attendance);
    }
    if (saved.pricing === 'free' || saved.pricing === 'paid') setPricing(saved.pricing);
    if (saved.capacityType === 'limited' || saved.capacityType === 'unlimited') {
      setCapacityType(saved.capacityType);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mode]);

  const persistDraft = () => {
    if (mode !== 'create' || !formRef.current) return;
    try {
      const fd = new FormData(formRef.current);
      const out: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (typeof v === 'string' && k !== 'cover') out[k] = v.slice(0, 2000);
      });
      localStorage.setItem('adify:event:draft', JSON.stringify(out));
    } catch {
      // storage unavailable
    }
  };

  const gotoStep = (n: number) => {
    const clamped = Math.min(7, Math.max(1, n));
    if (clamped === 7 && formRef.current) {
      const fd = new FormData(formRef.current);
      const out: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (typeof v === 'string') out[k] = v;
      });
      setPreview(out);
    }
    setStep(clamped);
    stepRefs.current[clamped - 1]?.querySelector<HTMLElement>('input,select,textarea')?.focus();
  };

  const continueStep = () => {
    const el = stepRefs.current[step - 1];
    if (el) {
      const fields = el.querySelectorAll('input,select,textarea');
      for (const f of fields) {
        const input = f as HTMLInputElement;
        if (!input.checkValidity()) {
          input.reportValidity();
          return;
        }
      }
    }
    gotoStep(step + 1);
  };

  const errorFields = Object.keys(fe);

  return (
    <form ref={formRef} action={formAction} onChange={persistDraft} className="space-y-4">
      {/* No manual encType: React sets multipart automatically for function actions (cover uploads keep working). */}
      {state.error && (
        <p role="alert" className="rounded-md bg-adify-error/10 px-4 py-3 text-sm font-medium text-adify-error">
          {state.error}
          {errorFields.length > 0 && <span className="block font-normal">Check: {errorFields.join(', ')}</span>}
        </p>
      )}

      <ol className="flex flex-wrap gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => gotoStep(i + 1)}
              aria-current={step === i + 1 ? 'step' : undefined}
              className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
                step === i + 1
                  ? 'border-adify-action bg-adify-action text-white'
                  : 'border-adify-line bg-white hover:border-adify-action'
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Step 1 — Basic */}
      <fieldset ref={(el) => { stepRefs.current[0] = el; }} hidden={step !== 1} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Basic information</legend>
        <div>
          <label htmlFor="ev-title" className={labelCls}>Event title {req}</label>
          <input id="ev-title" name="title" type="text" required minLength={4} maxLength={120} defaultValue={e?.title ?? ''} className={inputCls} />
          <FieldError message={fe.title} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-class" className={labelCls}>Type {req}</label>
            <select id="ev-class" name="class" required defaultValue={e?.class ?? 'event'} className={inputCls}>
              <option value="event">Event</option>
              <option value="ceremony">Ceremony</option>
            </select>
            <FieldError message={fe.class} />
          </div>
          <div>
            <label htmlFor="ev-category" className={labelCls}>Category {req}</label>
            <select id="ev-category" name="category" required defaultValue={e?.category ?? ''} className={inputCls}>
              <option value="">Select…</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FieldError message={fe.category} />
          </div>
        </div>
        <div>
          <label htmlFor="ev-desc" className={labelCls}>Description {req}</label>
          <textarea id="ev-desc" name="description" required minLength={20} maxLength={8000} rows={5} defaultValue={e?.description ?? ''} className={inputCls} />
          <FieldError message={fe.description} />
        </div>
        <div>
          <label htmlFor="ev-cover" className={labelCls}>Cover image <span className="font-normal text-adify-muted">(JPG/PNG/WebP/GIF, up to 5 MB)</span></label>
          <input id="ev-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={inputCls} />
          {e?.coverUrl && <p className="mt-1 text-sm text-adify-muted">Current cover is kept unless you choose a new file.</p>}
          <FieldError message={fe.cover} />
        </div>
      </fieldset>

      {/* Step 2 — Schedule */}
      <fieldset ref={(el) => { stepRefs.current[1] = el; }} hidden={step !== 2} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Schedule</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ev-sd" className={labelCls}>Start date {req}</label>
            <input id="ev-sd" name="startDate" type="date" required defaultValue={initialSchedule?.startDate ?? ''} className={inputCls} />
            <FieldError message={fe.startDate} />
          </div>
          <div>
            <label htmlFor="ev-st" className={labelCls}>Start time {req}</label>
            <input id="ev-st" name="startTime" type="time" required defaultValue={initialSchedule?.startTime ?? ''} className={inputCls} />
          </div>
          <div>
            <label htmlFor="ev-ed" className={labelCls}>End date {req}</label>
            <input id="ev-ed" name="endDate" type="date" required defaultValue={initialSchedule?.endDate ?? ''} className={inputCls} />
            <FieldError message={fe.endDate} />
          </div>
          <div>
            <label htmlFor="ev-et" className={labelCls}>End time {req}</label>
            <input id="ev-et" name="endTime" type="time" required defaultValue={initialSchedule?.endTime ?? ''} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="ev-tz" className={labelCls}>Event timezone {req}</label>
          <select id="ev-tz" name="timezone" required defaultValue={e?.timezone ?? 'UTC'} className={inputCls}>
            {AFRICA_TIMEZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <FieldError message={fe.timezone} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ev-dd" className={labelCls}>Booking deadline <span className="font-normal text-adify-muted">(optional)</span></label>
            <input id="ev-dd" name="deadlineDate" type="date" defaultValue={initialSchedule?.deadlineDate ?? ''} className={inputCls} />
            <FieldError message={fe.deadlineDate} />
          </div>
          <div>
            <label htmlFor="ev-dt" className={labelCls}>Deadline time</label>
            <input id="ev-dt" name="deadlineTime" type="time" defaultValue={initialSchedule?.deadlineTime ?? ''} className={inputCls} />
          </div>
        </div>
      </fieldset>

      {/* Step 3 — Attendance */}
      <fieldset ref={(el) => { stepRefs.current[2] = el; }} hidden={step !== 3} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Attendance format</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Attendance format">
          {(['physical', 'online', 'hybrid'] as const).map((v) => (
            <label key={v} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-bold capitalize ${attendance === v ? 'border-adify-action bg-adify-wash' : 'border-adify-line'}`}>
              <input type="radio" name="attendance" value={v} checked={attendance === v} onChange={() => setAttendance(v)} className="sr-only" />
              {v}
            </label>
          ))}
        </div>
        <FieldError message={fe.attendance} />
      </fieldset>

      {/* Step 4 — Venue / Online */}
      <fieldset ref={(el) => { stepRefs.current[3] = el; }} hidden={step !== 4} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Venue / online details</legend>
        {needsPhysical && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-venue" className={labelCls}>Venue name {req}</label>
                <input id="ev-venue" name="venueName" type="text" required={needsPhysical} maxLength={200} defaultValue={e?.venueName ?? ''} className={inputCls} />
                <FieldError message={fe.venueName} />
              </div>
              <div>
                <label htmlFor="ev-city" className={labelCls}>City {req}</label>
                <input id="ev-city" name="city" type="text" required={needsPhysical} maxLength={120} defaultValue={e?.city ?? ''} className={inputCls} />
                <FieldError message={fe.city} />
              </div>
            </div>
            <div>
              <label htmlFor="ev-country" className={labelCls}>Country {req}</label>
              <select id="ev-country" name="country" required={needsPhysical} defaultValue={e?.country ?? ''} className={inputCls}>
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
              <FieldError message={fe.country} />
            </div>
            <div>
              <label htmlFor="ev-addr" className={labelCls}>Address</label>
              <input id="ev-addr" name="address" type="text" maxLength={300} defaultValue={e?.address ?? ''} className={inputCls} />
            </div>
            <div>
              <label htmlFor="ev-dir" className={labelCls}>Directions / map info</label>
              <textarea id="ev-dir" name="directions" rows={2} maxLength={500} defaultValue={e?.directions ?? ''} className={inputCls} />
            </div>
            <div>
              <label htmlFor="ev-acc" className={labelCls}>Accessibility details</label>
              <textarea id="ev-acc" name="accessibility" rows={2} maxLength={500} defaultValue={e?.accessibility ?? ''} className={inputCls} />
            </div>
          </>
        )}
        {needsOnline && (
          <>
            <div>
              <label htmlFor="ev-plat" className={labelCls}>Platform / session type {req}</label>
              <input id="ev-plat" name="onlinePlatform" type="text" required={needsOnline} maxLength={200} defaultValue={e?.onlinePlatform ?? ''} placeholder="e.g. Zoom, Google Meet" className={inputCls} />
              <FieldError message={fe.onlinePlatform} />
            </div>
            <div>
              <label htmlFor="ev-access" className={labelCls}>Access instructions {req}</label>
              <textarea id="ev-access" name="onlineAccess" required={needsOnline} rows={3} maxLength={1000} defaultValue={e?.onlineAccess ?? ''} className={inputCls} />
              <p className="mt-1 text-xs text-adify-muted">Shared only with confirmed attendees — never shown publicly.</p>
              <FieldError message={fe.onlineAccess} />
            </div>
          </>
        )}
        {!needsPhysical && (
          <div>
            <label htmlFor="ev-country-o" className={labelCls}>Country <span className="font-normal text-adify-muted">(optional, for discovery)</span></label>
            <select id="ev-country-o" name="country" defaultValue={e?.country ?? ''} className={inputCls}>
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {/* Step 5 — Reservations */}
      <fieldset ref={(el) => { stepRefs.current[4] = el; }} hidden={step !== 5} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Reservations</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pricing">
          {(['free', 'paid'] as const).map((v) => (
            <label key={v} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-bold capitalize ${pricing === v ? 'border-adify-action bg-adify-wash' : 'border-adify-line'}`}>
              <input type="radio" name="pricing" value={v} checked={pricing === v} onChange={() => setPricing(v)} className="sr-only" />
              {v}
            </label>
          ))}
        </div>
        {pricing === 'paid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-price" className={labelCls}>Price {req}</label>
              <input
                id="ev-price"
                name="priceAmount"
                type="number"
                min="0.01"
                step="0.01"
                required={pricing === 'paid'}
                defaultValue={e && eventPriceMinor(e) !== null ? (eventPriceMinor(e) as number) / 100 : ''}
                className={inputCls}
              />
              <FieldError message={fe.priceAmount} />
            </div>
            <div>
              <CurrencySelect name="currency" label={<>Currency {req}</>} defaultCode={e?.currency ?? ''} required={pricing === 'paid'} />
              <FieldError message={fe.currency} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Capacity">
          {(['limited', 'unlimited'] as const).map((v) => (
            <label key={v} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-bold capitalize ${capacityType === v ? 'border-adify-action bg-adify-wash' : 'border-adify-line'}`}>
              <input type="radio" name="capacityType" value={v} checked={capacityType === v} onChange={() => setCapacityType(v)} className="sr-only" />
              {v}
            </label>
          ))}
        </div>
        {capacityType === 'limited' && (
          <div>
            <label htmlFor="ev-cap" className={labelCls}>Total capacity {req}</label>
            <input id="ev-cap" name="capacity" type="number" min="1" step="1" required defaultValue={e?.capacity ?? ''} className={inputCls} />
            <FieldError message={fe.capacity} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-method" className={labelCls}>Booking method {req}</label>
            <select id="ev-method" name="bookingMethod" required defaultValue={e?.bookingMethod ?? 'request'} className={inputCls}>
              <option value="request">Request (organizer approves)</option>
              <option value="reserve">Reserve (instant confirmation)</option>
            </select>
          </div>
          <div>
            <label htmlFor="ev-spots" className={labelCls}>Max spots per booking</label>
            <input id="ev-spots" name="spotsPerBooking" type="number" min="1" max="20" step="1" defaultValue={e?.spotsPerBooking ?? 1} className={inputCls} />
          </div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="waitlistEnabled" defaultChecked={e?.waitlistEnabled ?? false} className="h-5 w-5 accent-adify-action" />
          Enable waitlist when sold out
        </label>
        <div>
          <label htmlFor="ev-elig" className={labelCls}>Eligibility requirements</label>
          <textarea id="ev-elig" name="eligibility" rows={2} maxLength={500} defaultValue={e?.eligibility ?? ''} className={inputCls} />
        </div>
      </fieldset>

      {/* Step 6 — Policies + dynamic inputs */}
      <fieldset ref={(el) => { stepRefs.current[5] = el; }} hidden={step !== 6} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Policies & program</legend>
        <div>
          <label htmlFor="ev-cancel" className={labelCls}>Cancellation policy {req}</label>
          <textarea id="ev-cancel" name="cancellationPolicy" required rows={2} maxLength={2000} defaultValue={e?.cancellationPolicy ?? ''} className={inputCls} />
          <FieldError message={fe.cancellationPolicy} />
        </div>
        <div>
          <label htmlFor="ev-refund" className={labelCls}>Refund terms</label>
          <textarea id="ev-refund" name="refundTerms" rows={2} maxLength={2000} defaultValue={e?.refundTerms ?? ''} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ev-rules" className={labelCls}>Attendance rules</label>
          <textarea id="ev-rules" name="attendanceRules" rows={2} maxLength={2000} defaultValue={e?.attendanceRules ?? ''} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ev-contact" className={labelCls}>Organizer contact {req}</label>
          <input id="ev-contact" name="organizerContact" type="text" required maxLength={300} defaultValue={e?.organizerContact ?? ''} placeholder="How attendees can reach you" className={inputCls} />
          <FieldError message={fe.organizerContact} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="publicListing" value="on" defaultChecked={e ? e.publicListing : true} className="h-5 w-5 accent-adify-action" />
          Show this listing in public discovery when published
        </label>

        <div className="border-t border-adify-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Program items <span className="font-normal text-adify-muted">(optional)</span></h3>
            <button
              type="button"
              onClick={() => program.length < 20 && setProgram((p) => [...p, { key: nextKey('p'), a: '', b: '' }])}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-adify-line px-3 py-1.5 text-sm font-bold hover:border-adify-action"
            >
              <Icon name="plus" /> Add
            </button>
          </div>
          <input type="hidden" name="programIds" value={program.map((p) => p.key).join(',')} />
          {program.map((p) => (
            <div key={p.key} className="mb-2 grid grid-cols-1 gap-2 rounded-md bg-adify-mist p-2 sm:grid-cols-[1fr_2fr_auto]">
              <input name={`program_title_${p.key}`} defaultValue={p.a} maxLength={120} placeholder="Session title" aria-label="Program item title" className={inputCls} />
              <input name={`program_detail_${p.key}`} defaultValue={p.b} maxLength={500} placeholder="Detail (optional)" aria-label="Program item detail" className={inputCls} />
              <button
                type="button"
                onClick={() => setProgram((list) => list.filter((x) => x.key !== p.key))}
                aria-label="Remove program item"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-adify-line bg-white px-3 hover:border-adify-error"
              >
                <Icon name="delete" label="Remove program item" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-adify-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Extra contacts <span className="font-normal text-adify-muted">(optional)</span></h3>
            <button
              type="button"
              onClick={() => contacts.length < 10 && setContacts((c) => [...c, { key: nextKey('c'), a: '', b: '' }])}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-adify-line px-3 py-1.5 text-sm font-bold hover:border-adify-action"
            >
              <Icon name="plus" /> Add
            </button>
          </div>
          <input type="hidden" name="contactIds" value={contacts.map((c) => c.key).join(',')} />
          {contacts.map((c) => (
            <div key={c.key} className="mb-2 grid grid-cols-1 gap-2 rounded-md bg-adify-mist p-2 sm:grid-cols-[1fr_2fr_auto]">
              <input name={`contact_name_${c.key}`} defaultValue={c.a} maxLength={120} placeholder="Name" aria-label="Contact name" className={inputCls} />
              <input name={`contact_detail_${c.key}`} defaultValue={c.b} maxLength={300} placeholder="Email or phone" aria-label="Contact detail" className={inputCls} />
              <button
                type="button"
                onClick={() => setContacts((list) => list.filter((x) => x.key !== c.key))}
                aria-label="Remove contact"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-adify-line bg-white px-3 hover:border-adify-error"
              >
                <Icon name="delete" label="Remove contact" />
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Step 7 — Preview & submit */}
      <fieldset ref={(el) => { stepRefs.current[6] = el; }} hidden={step !== 7} className="space-y-4 rounded-lg border border-adify-line bg-white p-4">
        <legend className="px-1 text-lg font-bold">Preview & submit</legend>
        {preview ? (
          <dl className="space-y-1 text-sm">
            {[
              ['Title', preview.title],
              ['Type', preview.class],
              ['Category', preview.category],
              ['When', `${preview.startDate} ${preview.startTime} → ${preview.endDate} ${preview.endTime} (${preview.timezone})`],
              ['Format', preview.attendance],
              ['Place', [preview.venueName, preview.city, preview.country].filter(Boolean).join(', ') || preview.onlinePlatform || '—'],
              ['Price', preview.pricing === 'paid' ? `${preview.priceAmount} ${preview.currency}` : 'Free'],
              ['Capacity', preview.capacityType === 'limited' ? preview.capacity : 'Unlimited'],
              ['Method', preview.bookingMethod],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-adify-line py-1.5 last:border-0">
                <dt className="w-24 shrink-0 text-adify-muted">{k}</dt>
                <dd className="font-medium">{v || '—'}</dd>
              </div>
            ))}
            <p className="whitespace-pre-line pt-2">{preview.description}</p>
          </dl>
        ) : (
          <p className="text-sm text-adify-muted">Review your listing before submitting.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {mode === 'create' ? (
            <>
              <button
                type="submit"
                name="submit"
                value="draft"
                disabled={pending}
                className="inline-flex min-h-12 items-center rounded-md border border-adify-line px-5 py-3 text-sm font-bold hover:border-adify-action disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                name="submit"
                value="publish"
                disabled={pending}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-adify-action px-5 py-3 text-sm font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
              >
                <Icon name="check" className="text-white" /> {pending ? 'Publishing…' : 'Save & Publish'}
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-adify-action px-5 py-3 text-sm font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
            >
              <Icon name="check" className="text-white" /> {pending ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => gotoStep(step - 1)}
          disabled={step === 1}
          className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action disabled:opacity-50"
        >
          Back
        </button>
        {step < 7 ? (
          <button
            type="button"
            onClick={continueStep}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-5 py-2 text-sm font-bold text-white hover:bg-adify-action-dark"
          >
            Continue <Icon name="arrow" className="text-white" />
          </button>
        ) : (
          <span className="text-sm text-adify-muted">Step 7 of 7</span>
        )}
      </div>
    </form>
  );
}
