// =====================================================================
//  CarruselPromos.jsx — Carrusel AUTOMÁTICO de promociones
//  - Cambia de promo cada 5 segundos (setInterval dentro de useEffect)
//  - Se puede deslizar con el dedo o tocar los puntitos
//  - Si el usuario lo toca, se pausa un momento para que pueda leer
// =====================================================================
import { useEffect, useRef, useState } from 'react';

const TIEMPO = 5000; // milisegundos entre una promo y otra

// Texto destacado según el tipo de promoción
function etiqueta(promo) {
  if (promo.tipo === 'combo') return `S/ ${promo.precio_combo.toFixed(2)}`;
  if (promo.tipo === 'regalo') return 'Gratis';
  if (promo.tipo === 'descuento_siguiente') return `${promo.porcentaje}% dscto.`;
  return '';
}

export default function CarruselPromos({ promociones }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const inicioToque = useRef(null);   // useRef: guarda un valor SIN redibujar
  const total = promociones.length;

  // Avance automático
  useEffect(() => {
    if (pausado || total <= 1) return;
    const id = setInterval(() => {
      setActual((i) => (i + 1) % total);   // % total → después de la última vuelve a la 0
    }, TIEMPO);
    return () => clearInterval(id);        // limpieza: detiene el timer al salir
  }, [pausado, total]);

  // Si se pausó, se reanuda solo después de 6 segundos
  useEffect(() => {
    if (!pausado) return;
    const id = setTimeout(() => setPausado(false), 6000);
    return () => clearTimeout(id);
  }, [pausado]);

  function irA(i) {
    setActual((i + total) % total);
    setPausado(true);
  }

  // Deslizar con el dedo: comparamos dónde empezó y dónde terminó el toque
  function alTocar(e) { inicioToque.current = e.touches[0].clientX; }
  function alSoltar(e) {
    if (inicioToque.current === null) return;
    const distancia = e.changedTouches[0].clientX - inicioToque.current;
    if (Math.abs(distancia) > 40) irA(actual + (distancia < 0 ? 1 : -1));
    inicioToque.current = null;
  }

  if (total === 0) return null;

  return (
    <section className="carrusel" aria-label="Promociones" onTouchStart={alTocar} onTouchEnd={alSoltar}>
      {/* La "pista" tiene todas las promos en fila; se mueve con translateX */}
      <div className="carrusel-pista" style={{ transform: `translateX(-${actual * 100}%)` }}>
        {promociones.map((promo) => (
          <article
            key={promo.id}
            className={`promo ${promo.imagen_url ? '' : 'promo-sin-foto'}`}
            style={promo.imagen_url ? { backgroundImage: `url(${promo.imagen_url})` } : undefined}
          >
            <div className="promo-contenido">
              <span className="promo-etiqueta">{etiqueta(promo)}</span>
              <h3 className="promo-titulo">{promo.titulo}</h3>
              <p className="promo-descripcion">{promo.descripcion}</p>
              {promo.solo_registrados && <p className="promo-nota">Solo clientes registrados</p>}
            </div>
          </article>
        ))}
      </div>

      {/* Puntitos de navegación */}
      {total > 1 && (
        <div className="carrusel-puntos">
          {promociones.map((promo, i) => (
            <button
              key={promo.id}
              className={`carrusel-punto ${i === actual ? 'activo' : ''}`}
              onClick={() => irA(i)}
              aria-label={`Ver promoción ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
