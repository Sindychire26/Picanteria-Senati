// =====================================================================
//  Logo.jsx — Logo de la picantería
//  Busca /imagenes/logo.png en el backend. Si no existe, no muestra nada.
// =====================================================================
import { useState } from 'react';
import { RESTAURANTE } from '../config.js';

export default function Logo({ className = '' }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return null;

  return (
    <img
      src={RESTAURANTE.logo}
      alt={`Logo de ${RESTAURANTE.nombre}`}
      className={className}
      onError={() => setFallo(true)}
    />
  );
}
