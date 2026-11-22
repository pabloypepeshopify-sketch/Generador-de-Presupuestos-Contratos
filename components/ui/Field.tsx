'use client';

import Link from 'next/link';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const fieldClass =
  'w-full rounded-xl border border-ink-line bg-bg/60 px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-brand-blue/70 focus:ring-2 focus:ring-brand-blue/25 aria-[invalid=true]:border-red-400/70';

type Base = { label: string; name: string; error?: string; hint?: string; optional?: boolean; className?: string };

function Wrapper({ label, name, error, hint, optional, className, children }: Base & { children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={`f-${name}`} className="text-sm font-medium">
        {label} {optional && <span className="font-normal text-ink-faint">(opcional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`f-${name}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`f-${name}-error`} role="alert" className="text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: string) =>
  error ? `f-${name}-error` : hint ? `f-${name}-hint` : undefined;

export function TextField({ label, name, error, hint, optional, className, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrapper {...{ label, name, error, hint, optional, className }}>
      <input
        id={`f-${name}`}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        required={!optional}
        className={fieldClass}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextArea({ label, name, error, hint, optional, className, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper {...{ label, name, error, hint, optional, className }}>
      <textarea
        id={`f-${name}`}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        required={!optional}
        className={cn(fieldClass, 'resize-y')}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  optional,
  className,
  options,
  ...rest
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <Wrapper {...{ label, name, error, hint, optional, className }}>
      <select
        id={`f-${name}`}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        required={!optional}
        className={cn(fieldClass, 'appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23AEB4C6' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        <option value="">Elige una opción</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Casilla de consentimiento RGPD con enlace a la política de privacidad. */
export function PrivacyCheck({ name = 'privacidad', checked, onChange, error }: { name?: string; checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          id={`f-${name}`}
          name={name}
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `f-${name}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-line accent-[rgb(var(--c-brand-blue))]"
        />
        <span>
          He leído y acepto la{' '}
          <Link href="/privacidad" target="_blank" className="text-ink underline underline-offset-2">
            política de privacidad
          </Link>
          . Usaremos tus datos solo para responder a tu solicitud.
        </span>
      </label>
      {error && (
        <p id={`f-${name}-error`} role="alert" className="text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** Campo trampa antispam: invisible para personas (y para lectores de pantalla). */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        No rellenes este campo
        <input type="text" name="web" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
