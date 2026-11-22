'use client';

import { motion } from 'framer-motion';
import { site } from '@/lib/site.config';

// Coordenadas aproximadas (latitud, longitud) de las localidades de site.config.
const COORDS: Record<string, [number, number]> = {
  'Sanlúcar de Barrameda': [36.778, -6.352],
  'Jerez de la Frontera': [36.686, -6.137],
  Cádiz: [36.527, -6.288],
  'El Puerto de Santa María': [36.594, -6.233],
  Chipiona: [36.737, -6.437],
  Rota: [36.617, -6.358],
  Chiclana: [36.419, -6.149],
  'San Fernando': [36.465, -6.198],
  Algeciras: [36.131, -5.454],
  Sevilla: [37.389, -5.984],
  'Dos Hermanas': [37.283, -5.921],
  Lebrija: [36.92, -6.075],
  Utrera: [37.185, -5.781],
  'Alcalá de Guadaíra': [37.338, -5.84],
  'Los Palacios': [37.161, -5.924],
  Écija: [37.541, -5.083],
};
const ETIQUETAS = ['Sevilla', 'Jerez de la Frontera', 'Cádiz', 'Algeciras', 'Écija'];

const W = 400;
const H = 360;
// Proyección simple (equirectangular) del recuadro de la zona
const M = 34; // margen interior
const x = (lon: number) => M + ((lon + 6.5) / 1.45) * (W - 2 * M);
const y = (lat: number) => M + ((37.6 - lat) / 1.5) * (H - 2 * M);

/** Mapa abstracto: Sanlúcar en el centro de la red y líneas a cada localidad. */
export function ZonaMap() {
  const base = COORDS[site.zona.base];
  const pueblos = site.zona.provincias.flatMap((p) => p.pueblos).filter((n) => n !== site.zona.base && COORDS[n]);
  const bx = x(base[1]);
  const by = y(base[0]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Mapa: trabajamos desde ${site.zona.base} en la provincia de Cádiz y Sevilla`}>
      <defs>
        <pattern id="zm-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill="white" fillOpacity=".07" />
        </pattern>
        <radialGradient id="zm-glow">
          <stop offset="0" stopColor="rgb(63 125 251)" stopOpacity=".35" />
          <stop offset="1" stopColor="rgb(63 125 251)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="zm-line" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(51 198 244)" />
          <stop offset="1" stopColor="rgb(124 92 255)" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#zm-dots)" />
      <circle cx={bx} cy={by} r="120" fill="url(#zm-glow)" />

      {pueblos.map((n, i) => {
        const [lat, lon] = COORDS[n];
        return (
          <motion.line
            key={`l-${n}`}
            x1={bx}
            y1={by}
            x2={x(lon)}
            y2={y(lat)}
            stroke="url(#zm-line)"
            strokeOpacity=".45"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}

      {pueblos.map((n, i) => {
        const [lat, lon] = COORDS[n];
        const px = x(lon);
        const py = y(lat);
        return (
          <g key={`p-${n}`}>
            <motion.circle
              cx={px}
              cy={py}
              r="3.2"
              fill="white"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9 + i * 0.07, type: 'spring', stiffness: 300, damping: 18 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            {ETIQUETAS.includes(n) && (
              <text x={px > W - 70 ? px - 7 : px + 7} y={py + 4} fontSize="13" fill="white" fillOpacity=".65" textAnchor={px > W - 70 ? 'end' : 'start'}>
                {n.replace(' de la Frontera', '')}
              </text>
            )}
          </g>
        );
      })}

      {/* Base */}
      <circle cx={bx} cy={by} r="6" fill="rgb(51 198 244)" className="radar" />
      <circle cx={bx} cy={by} r="6" fill="rgb(51 198 244)" className="radar" style={{ '--delay': '1.4s' } as React.CSSProperties} />
      <circle cx={bx} cy={by} r="6.5" fill="white" stroke="rgb(51 198 244)" strokeWidth="3" />
      <text x={bx + 2} y={by + 24} fontSize="14" fontWeight="600" fill="white" textAnchor="middle">
        Sanlúcar
      </text>
    </svg>
  );
}
