import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ForgotForm, LoginForm, RegisterForm, ResetForm, VerifyForm } from '@/components/AuthForms';
import { Icon } from '@/components/Icon';
import { getCurrentUser } from '@/lib/auth';
import { ALL_COUNTRIES } from '@/lib/countries';
import { safeNextPath } from '@/lib/util';

export const metadata: Metadata = { title: 'Sign in or register' };

// Auth must block: the logged-in redirect decision requires the session
// before anything paints, so instant navigation is explicitly not expected.
export const instant = false;

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

function BrandPanel() {
  return (
    <div className="flex h-full flex-col justify-center bg-adify-action px-8 py-10 text-white lg:px-12">
      <Link href="/" className="inline-flex items-center gap-2" aria-label="ADIFY home">
        <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-xl font-bold text-adify-action">
          A
        </span>
        <span className="text-2xl font-bold tracking-tight">ADIFY</span>
      </Link>
      <h1 className="mt-8 text-3xl font-bold leading-tight">Your next experience starts here.</h1>
      <p className="mt-2 max-w-md text-white/90">
        Discover public events, meaningful ceremonies and opportunities to connect with people across Africa.
      </p>
      <ul className="mt-6 space-y-3 text-white/95">
        <li className="flex items-center gap-3">
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Icon name="search" className="text-white" />
          </span>
          Discover events around you.
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Icon name="booking" className="text-white" />
          </span>
          Reserve your spot.
        </li>
        <li className="flex items-center gap-3">
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Icon name="create" className="text-white" />
          </span>
          Publish your own public gatherings.
        </li>
      </ul>
    </div>
  );
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawMode = typeof sp.mode === 'string' ? sp.mode : 'login';
  const mode: Mode =
    rawMode === 'register' || rawMode === 'forgot' || rawMode === 'reset' || rawMode === 'verify'
      ? rawMode
      : 'login';
  const next = safeNextPath(typeof sp.next === 'string' ? sp.next : null) ?? '/dashboard';
  const user = await getCurrentUser().catch(() => null);

  // Logged-in users don't need login/register/forgot/reset; verify needs the session.
  if (user && mode !== 'verify') redirect(next);

  const titles: Record<Mode, { title: string; sub: string }> = {
    login: { title: 'Welcome back', sub: 'Log in to manage bookings and publish events.' },
    register: { title: 'Create your account', sub: 'One account for discovering, booking and publishing.' },
    forgot: { title: 'Forgot password', sub: 'We will email you reset instructions.' },
    reset: { title: 'Set a new password', sub: 'Choose a strong password you have not used before.' },
    verify: { title: 'Verify your email', sub: 'Enter the 6-digit code we sent you.' },
  };
  const { title, sub } = titles[mode];

  return (
    <main id="main" className="min-h-dvh lg:grid lg:grid-cols-[45%_55%]">
      <div className="hidden lg:block" aria-hidden={false}>
        <BrandPanel />
      </div>
      <div className="flex flex-col px-4 py-6 sm:px-8 lg:justify-center lg:px-16">
        <div className="mb-6 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="ADIFY home">
            <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-adify-action text-lg font-bold text-white">
              A
            </span>
            <span className="text-xl font-bold tracking-tight">ADIFY</span>
          </Link>
          <p className="mt-1 text-sm text-adify-muted">Your next experience starts here.</p>
        </div>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-adify-muted">{sub}</p>
          {mode === 'login' && <LoginForm next={next} />}
          {mode === 'register' && <RegisterForm next={next} countries={ALL_COUNTRIES} />}
          {mode === 'forgot' && <ForgotForm />}
          {mode === 'reset' && (
            <ResetForm
              email={typeof sp.email === 'string' ? sp.email : ''}
              token={typeof sp.token === 'string' ? sp.token : ''}
            />
          )}
          {mode === 'verify' && (user ? <VerifyForm /> : (
            <p className="rounded-md bg-adify-mist px-4 py-3 text-sm">
              Please{' '}
              <Link href="/auth?mode=login&next=/auth?mode=verify" className="font-bold text-adify-action hover:underline">
                log in
              </Link>{' '}
              to verify your email.
            </p>
          ))}
          {(mode === 'login' || mode === 'register') && (
            <p className="mt-6 text-center text-sm text-adify-muted">
              {mode === 'login' ? (
                <>
                  New to ADIFY?{' '}
                  <Link href={`/auth?mode=register&next=${encodeURIComponent(next)}`} className="font-bold text-adify-action hover:underline">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link href={`/auth?mode=login&next=${encodeURIComponent(next)}`} className="font-bold text-adify-action hover:underline">
                    Log in
                  </Link>
                </>
              )}
            </p>
          )}
          {mode === 'forgot' && (
            <p className="mt-6 text-center text-sm text-adify-muted">
              <Link href="/auth?mode=login" className="font-bold text-adify-action hover:underline">
                Back to login
              </Link>
            </p>
          )}
          <p className="mt-8 text-center text-xs text-adify-muted">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
