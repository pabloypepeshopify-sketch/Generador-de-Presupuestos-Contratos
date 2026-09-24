import { ImageResponse } from 'next/og';
import { site } from '@/lib/site.config';
import { logoSvg, LOGO_VIEWBOX } from '@/lib/brand';

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const [LW, LH] = LOGO_VIEWBOX.stacked;
const LOGO_W = 520;
const logoSrc = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg('stacked', 'og'))}`;

/** Imagen para compartir (WhatsApp, redes) con el logotipo VISAX NFC. */
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
              'radial-gradient(circle, rgba(63,125,251,0.32), rgba(124,92,255,0.12) 55%, transparent 70%)',
            top: -140,
            left: 250,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={LOGO_W} height={Math.round((LOGO_W * LH) / LW)} alt="" />
        <div style={{ fontSize: 32, color: '#AEB4C6', marginTop: 40 }}>{site.tagline}</div>
      </div>
    ),
    { ...size },
  );
}
