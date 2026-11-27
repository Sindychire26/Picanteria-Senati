// =====================================================================
//  Picante.jsx — Etiqueta del nivel de picante de un plato
//  0 = no pica (no se muestra nada), 1 = "Pica poco", 2 = "Picante"
//  Lleva uno o dos ajíes dibujados (SVG) para que se vea de un vistazo.
// =====================================================================
export const NIVELES_PICANTE = ['No pica', 'Pica poco', 'Picante'];

function Aji() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M6 3 C10 3 11 7 9 10 C7.5 12.5 4 13.5 2 13 C4 11 4 7 6 3Z" fill="currentColor" />
      <path d="M6 3 C6 1.5 7 0.8 8.5 0.8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Picante({ nivel }) {
  if (!nivel) return null;
  return (
    <span className={`picante picante-${nivel}`}>
      <Aji />{nivel === 2 && <Aji />}
      {NIVELES_PICANTE[nivel]}
    </span>
  );
}
