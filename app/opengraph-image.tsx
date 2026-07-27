import { ImageResponse } from 'next/og';
import { site } from '@/lib/site.config';

export const runtime = 'edge';
export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagen Open Graph generada con la marca para compartir en redes. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06060B',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 700,
            height: 700,
            borderRadius: 700,
            background:
              'radial-gradient(circle, rgba(63,125,251,0.45), rgba(124,92,255,0.15) 55%, transparent 70%)',
            top: -120,
            left: 250,
          }}
        />
        {/* Monograma */}
        <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="g" x1="14" y1="12" x2="52" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#33C6F4" />
              <stop offset="0.5" stopColor="#3F7DFB" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <path
            d="M15 17 L32 51 L49 17"
            stroke="url(#g)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M39 27 L30 45 L40 55"
            stroke="#EAF0F8"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -2,
            color: '#F5F7FB',
            marginTop: 28,
          }}
        >
          VISAX{' '}
          <span
            style={{
              marginLeft: 20,
              background: 'linear-gradient(120deg,#33C6F4,#8B5CF6)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            AI
          </span>
        </div>
        <div style={{ fontSize: 34, color: '#AEB4C6', marginTop: 12 }}>{site.tagline}</div>
      </div>
    ),
    { ...size },
  );
}
