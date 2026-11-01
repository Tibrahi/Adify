'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  changePasswordAction,
  resendCodeAction,
  updateProfileAction,
  type ActionResult,
} from '@/lib/actions';
import type { CountryInfo } from '@/lib/countries';
import type { User } from '@/lib/types';
import { Icon } from './Icon';

const initial: ActionResult = { ok: false };
const inputCls =
  'min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm placeholder:text-adify-muted';
const labelCls = 'mb-1 block text-sm font-medium';

export function ProfileForms({ user, countries }: { user: User; countries: CountryInfo[] }) {
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(
    async (prev: ActionResult, fd: FormData) => {
      const r = await updateProfileAction(prev, fd);
      if (r.ok) router.refresh();
      return r;
    },
    initial,
  );
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, initial);
  const saved = profileState.ok && !profilePending;
  const pwSaved = pwState.ok && !pwPending;
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const fe = profileState.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-adify-line bg-white p-4" aria-label="Profile details">
        <h2 className="text-lg font-bold">Profile details</h2>
        <form action={profileAction} className="mt-3 space-y-4">
          {profileState.error && (
            <p role="alert" className="rounded-md bg-adify-error/10 px-3 py-2 text-sm font-medium text-adify-error">
              {profileState.error}
            </p>
          )}
          {saved && (
            <p role="status" className="rounded-md bg-adify-mist px-3 py-2 text-sm font-medium">
              Profile saved.
            </p>
          )}
          <div>
            <label htmlFor="pf-name" className={labelCls}>
              Full name
            </label>
            <input id="pf-name" name="fullName" type="text" required defaultValue={user.fullName} maxLength={80} className={inputCls} />
            {fe.fullName && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.fullName}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-country" className={labelCls}>Country</label>
              <select id="pf-country" name="country" defaultValue={user.country} className={inputCls}>
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
              {fe.country && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.country}</p>}
            </div>
            <div>
              <label htmlFor="pf-phone" className={labelCls}>Phone</label>
              <input id="pf-phone" name="phone" type="tel" defaultValue={user.phone} placeholder="+234 …" className={inputCls} />
              {fe.phone && <p role="alert" className="mt-1 text-sm text-adify-error">{fe.phone}</p>}
            </div>
          </div>
          <button
            type="submit"
            disabled={profilePending}
            className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
          >
            {profilePending ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-adify-line bg-white p-4" aria-label="Email and security">
        <h2 className="text-lg font-bold">Email & security</h2>
        <p className="mt-2 text-sm">
          {user.email}{' '}
          {user.emailVerifiedAt ? (
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-adify-wash px-2 py-0.5 text-xs font-bold">
              <Icon name="ok" className="text-adify-action" /> Verified
            </span>
          ) : (
            <span className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-bold">Not verified</span>
          )}
        </p>
        {!user.emailVerifiedAt && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link href="/auth?mode=verify" className="text-sm font-bold text-adify-action hover:underline">
              Enter verification code
            </Link>
            <button
              type="button"
              onClick={async () => {
                const r = await resendCodeAction();
                setCodeMsg(r.ok ? 'A new code is on the way.' : (r.error ?? 'Could not resend.'));
              }}
              className="min-h-10 text-sm font-bold text-adify-action hover:underline"
            >
              Resend code
            </button>
            {codeMsg && <span role="status" className="text-sm text-adify-muted">{codeMsg}</span>}
          </div>
        )}
        <form action={pwAction} className="mt-4 space-y-4 border-t border-adify-line pt-4">
          <h3 className="font-bold">Change password</h3>
          {pwState.error && (
            <p role="alert" className="rounded-md bg-adify-error/10 px-3 py-2 text-sm font-medium text-adify-error">
              {pwState.error}
            </p>
          )}
          {pwSaved && (
            <p role="status" className="rounded-md bg-adify-mist px-3 py-2 text-sm font-medium">
              Password changed.
            </p>
          )}
          <div>
            <label htmlFor="pw-current" className={labelCls}>Current password</label>
            <input id="pw-current" name="current" type={showPw ? 'text' : 'password'} required autoComplete="current-password" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pw-new" className={labelCls}>New password</label>
              <input id="pw-new" name="password" type={showPw ? 'text' : 'password'} required autoComplete="new-password" className={inputCls} />
            </div>
            <div>
              <label htmlFor="pw-confirm" className={labelCls}>Confirm new password</label>
              <input id="pw-confirm" name="confirm" type={showPw ? 'text' : 'password'} required autoComplete="new-password" className={inputCls} />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="h-5 w-5 accent-adify-action" />
            Show passwords
          </label>
          <button
            type="submit"
            disabled={pwPending}
            className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
          >
            {pwPending ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-adify-line bg-white p-4" aria-label="Privacy">
        <h2 className="text-lg font-bold">Privacy</h2>
        <p className="mt-1 text-sm text-adify-muted">
          Your email and phone number stay private. Organizers see only your name on bookings you make.
          To request account deletion, contact support and we will process it subject to booking-record
          retention rules.
        </p>
        <Link href="/dashboard/help" className="mt-2 inline-block text-sm font-bold text-adify-action hover:underline">
          Contact support →
        </Link>
      </section>
    </div>
  );
}
