'use client';

import { useActionState } from 'react';
import { supportAction, type ActionResult } from '@/lib/actions';

const initial: ActionResult = { ok: false };
const inputCls =
  'min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm placeholder:text-adify-muted';
const labelCls = 'mb-1 block text-sm font-medium';

const TOPICS = ['Booking help', 'Publishing help', 'Account & login', 'Report a listing', 'Other'];

export function SupportForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(supportAction, initial);
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <p role="status" className="rounded-md bg-adify-mist px-4 py-4 text-sm font-medium">
        Thank you — your message was received. Our support team will reply to your email address.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-adify-error/10 px-3 py-2 text-sm font-medium text-adify-error">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sp-name" className={labelCls}>Name</label>
          <input id="sp-name" name="name" type="text" required defaultValue={defaultName} maxLength={80} className={inputCls} />
          {fe.name && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.name}</p>}
        </div>
        <div>
          <label htmlFor="sp-email" className={labelCls}>Email</label>
          <input id="sp-email" name="email" type="email" required defaultValue={defaultEmail} className={inputCls} />
          {fe.email && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.email}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sp-topic" className={labelCls}>Topic</label>
          <select id="sp-topic" name="topic" required defaultValue="" className={inputCls}>
            <option value="">Select…</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {fe.topic && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.topic}</p>}
        </div>
        <div>
          <label htmlFor="sp-ref" className={labelCls}>Booking reference <span className="font-normal text-adify-muted">(optional)</span></label>
          <input id="sp-ref" name="bookingRef" type="text" maxLength={12} placeholder="ADF-XXXXXX" className={inputCls} />
          {fe.bookingRef && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.bookingRef}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="sp-pref" className={labelCls}>Contact preference</label>
        <select id="sp-pref" name="contactPref" defaultValue="email" className={inputCls}>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </div>
      <div>
        <label htmlFor="sp-msg" className={labelCls}>Message</label>
        <textarea id="sp-msg" name="message" required minLength={10} maxLength={3000} rows={5} className={inputCls} />
        {fe.message && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.message}</p>}
      </div>
      {/* Honeypot: real users leave this empty. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="sp-company">Company</label>
        <input id="sp-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-5 py-2 text-sm font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
