'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendCodeAction,
  resetPasswordAction,
  verifyEmailAction,
  type ActionResult,
} from '@/lib/actions';
import type { CountryInfo } from '@/lib/countries';
import { Icon } from './Icon';

const initial: ActionResult = { ok: false };

function useRedirectOnOk(state: ActionResult) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-adify-error">
      {message}
    </p>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-adify-error/10 px-3 py-2 text-sm font-medium text-adify-error">
      {message}
    </p>
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} <span aria-hidden className="text-adify-error">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className="min-h-12 w-full rounded-md border border-adify-line bg-white px-3 py-2.5 pr-12 text-base"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-md hover:bg-adify-mist"
        >
          <Icon name={visible ? 'eyeSlash' : 'eye'} label={visible ? 'Hide password' : 'Show password'} />
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

const inputCls =
  'min-h-12 w-full rounded-md border border-adify-line bg-white px-3 py-2.5 text-base placeholder:text-adify-muted';
const labelCls = 'mb-1 block text-sm font-medium';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  useRedirectOnOk(state);
  return (
    <form action={formAction} className="space-y-4" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />
      <div>
        <label htmlFor="login-email" className={labelCls}>
          Email address <span aria-hidden className="text-adify-error">*</span>
        </label>
        <input id="login-email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <PasswordInput id="login-password" name="password" label="Password" autoComplete="current-password" />
      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="remember" className="h-5 w-5 accent-adify-action" /> Remember me
        </label>
        <Link href="/auth?mode=forgot" className="text-sm font-bold text-adify-action hover:underline">
          Forgot password?
        </Link>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
      >
        <Icon name="login" className="text-white" /> {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  );
}

export function RegisterForm({ next, countries }: { next: string; countries: CountryInfo[] }) {
  const [state, formAction, pending] = useActionState(registerAction, initial);
  useRedirectOnOk(state);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />
      <div>
        <label htmlFor="reg-name" className={labelCls}>
          Full name <span aria-hidden className="text-adify-error">*</span>
        </label>
        <input id="reg-name" name="fullName" type="text" required autoComplete="name" maxLength={80} className={inputCls} aria-invalid={Boolean(fe.fullName)} />
        <FieldError message={fe.fullName} />
      </div>
      <div>
        <label htmlFor="reg-email" className={labelCls}>
          Email address <span aria-hidden className="text-adify-error">*</span>
        </label>
        <input id="reg-email" name="email" type="email" required autoComplete="email" className={inputCls} aria-invalid={Boolean(fe.email)} />
        <FieldError message={fe.email} />
      </div>
      <PasswordInput id="reg-password" name="password" label="Password" autoComplete="new-password" error={fe.password} />
      <PasswordInput id="reg-confirm" name="confirm" label="Confirm password" autoComplete="new-password" error={fe.confirm} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-country" className={labelCls}>
            Country <span className="font-normal text-adify-muted">(optional)</span>
          </label>
          <select id="reg-country" name="country" className={`${inputCls} min-h-12`} defaultValue="">
            <option value="">Select…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <FieldError message={fe.country} />
        </div>
        <div>
          <label htmlFor="reg-phone" className={labelCls}>
            Phone <span className="font-normal text-adify-muted">(optional)</span>
          </label>
          <input id="reg-phone" name="phone" type="tel" autoComplete="tel" placeholder="+234 …" className={inputCls} aria-invalid={Boolean(fe.phone)} />
          <FieldError message={fe.phone} />
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1 h-5 w-5 shrink-0 accent-adify-action" />
        <span>
          I agree to the Terms of Service and Privacy Policy. <span aria-hidden className="text-adify-error">*</span>
        </span>
      </label>
      <FieldError message={fe.terms} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
      >
        <Icon name="register" className="text-white" /> {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initial);
  if (state.ok) {
    return (
      <p role="status" className="rounded-md bg-adify-mist px-4 py-3 text-sm font-medium">
        If an account exists for that email, reset instructions are on the way. Please check your inbox.
      </p>
    );
  }
  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <label htmlFor="forgot-email" className={labelCls}>
          Email address <span aria-hidden className="text-adify-error">*</span>
        </label>
        <input id="forgot-email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send reset instructions'}
      </button>
    </form>
  );
}

export function ResetForm({ email, token }: { email: string; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);
  useRedirectOnOk(state);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <PasswordInput id="reset-password" name="password" label="New password" autoComplete="new-password" />
      <PasswordInput id="reset-confirm" name="confirm" label="Confirm new password" autoComplete="new-password" />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
      >
        {pending ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verifyEmailAction, initial);
  const [resent, setResent] = useState<string | null>(null);
  useRedirectOnOk(state);
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div>
          <label htmlFor="verify-code" className={labelCls}>
            6-digit code <span aria-hidden className="text-adify-error">*</span>
          </label>
          <input
            id="verify-code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            placeholder="123456"
            className={`${inputCls} tracking-[0.3em]`}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:opacity-60"
        >
          {pending ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
      <form
        action={async () => {
          const r = await resendCodeAction();
          setResent(r.ok ? 'A new code is on the way.' : (r.error ?? 'Could not resend.'));
        }}
      >
        <button type="submit" className="min-h-11 text-sm font-bold text-adify-action hover:underline">
          Resend code
        </button>
      </form>
      {resent && (
        <p role="status" className="text-sm text-adify-muted">
          {resent}
        </p>
      )}
    </div>
  );
}
