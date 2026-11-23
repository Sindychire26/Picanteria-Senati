// =====================================================================
//  Buscador.jsx — Barra de búsqueda
//  Es un "componente controlado": el texto vive en Carta.jsx (texto)
//  y este componente solo lo muestra y avisa cuando cambia (onCambiar).
// =====================================================================
import { useEffect, useRef } from 'react';
import { IconoBuscar, IconoCerrar } from './Iconos.jsx';

export default function Buscador({ texto, onCambiar, onCerrar }) {
  const input = useRef(null);

  // Al abrir el buscador, el cursor se pone solo en la caja de texto
  useEffect(() => { input.current?.focus(); }, []);

  return (
    <div className="buscador">
      <div className="buscador-caja">
        <IconoBuscar width={18} height={18} />
        <input
          ref={input}
          type="search"
          placeholder="Busca un plato, ej: rocoto, chicha..."
          value={texto}
          onChange={(e) => onCambiar(e.target.value)}
        />
        {texto && (
          <button className="buscador-limpiar" onClick={() => onCambiar('')} aria-label="Borrar búsqueda">
            <IconoCerrar width={16} height={16} />
          </button>
        )}
      </div>
      <button className="buscador-cancelar" onClick={onCerrar}>Cancelar</button>
    </div>
  );
}

// Quita tildes y mayúsculas: "Guiñapo" → "guinapo"
// Así "guinapo", "GUIÑAPO" y "guiñapo" encuentran lo mismo.
export function normalizar(texto) {
  return texto
    .normalize('NFD')                   // separa la letra de su tilde: "ñ" → "n" + "~"
    .replace(/[\u0300-\u036f]/g, '') // borra las tildes sueltas
    .toLowerCase()
    .trim();
}
