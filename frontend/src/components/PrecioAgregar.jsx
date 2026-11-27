// =====================================================================
//  PrecioAgregar.jsx — Precio + botón de agregar de un plato
//  · Plato normal: "S/ 22.00" y el botón +
//  · Plato con DOS TAMAÑOS (tiene precio_grande): dos botones, por
//    ejemplo "Vaso S/ 4.00 +" y "Jarra S/ 12.00 +", o "Personal" y
//    "1 litro". Cada uno agrega ese tamaño al carrito.
//  Lo usan PlatoCard (la carta) y MasPedidos (el carrusel).
// =====================================================================
export default function PrecioAgregar({ plato, onAgregar, className = 'plato-pie' }) {
  if (plato.precio_grande) {
    const chico = plato.nombre_chico || 'Chico';
    const grande = plato.nombre_grande || 'Grande';
    return (
      <div className={`${className} tamanos`}>
        <button className="boton-tamano" onClick={() => onAgregar(plato, 'chico')} aria-label={`Agregar ${plato.nombre}, ${chico}`}>
          <span>{chico}</span> S/ {plato.precio.toFixed(2)} <strong>+</strong>
        </button>
        <button className="boton-tamano" onClick={() => onAgregar(plato, 'grande')} aria-label={`Agregar ${plato.nombre}, ${grande}`}>
          <span>{grande}</span> S/ {plato.precio_grande.toFixed(2)} <strong>+</strong>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className="precio">S/ {plato.precio.toFixed(2)}</span>
      <button className="boton-agregar" onClick={() => onAgregar(plato)} aria-label={`Agregar ${plato.nombre}`}>
        +
      </button>
    </div>
  );
}
