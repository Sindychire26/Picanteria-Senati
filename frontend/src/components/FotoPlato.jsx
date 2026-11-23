// =====================================================================
//  FotoPlato.jsx — Muestra la foto de un plato
//  Si el plato no tiene foto, o el archivo no existe (error al cargar),
//  muestra un recuadro "Sin foto" en vez de una imagen rota.
// =====================================================================
import { useState } from 'react';

export default function FotoPlato({ src, alt, className = '' }) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return <div className={`foto foto-vacia ${className}`}>Sin foto</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`foto ${className}`}
      loading="lazy"              // carga la foto solo cuando aparece en pantalla
      onError={() => setFallo(true)}
    />
  );
}
