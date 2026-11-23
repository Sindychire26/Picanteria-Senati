// =====================================================================
//  PlatoCard.jsx — Tarjeta de UN plato
//  Es reutilizable: Carta.jsx la dibuja una vez por cada plato.
// =====================================================================
import FotoPlato from './FotoPlato.jsx';

export default function PlatoCard({ plato, onAgregar }) {
  return (
    <article className="plato">
      <FotoPlato src={plato.imagen_url} alt={plato.nombre} className="plato-foto" />

      <div className="plato-info">
        <h3 className="plato-nombre">{plato.nombre}</h3>
        <p className="plato-descripcion">{plato.descripcion}</p>
        <div className="plato-pie">
          <span className="precio">S/ {plato.precio.toFixed(2)}</span>
          <button className="boton-agregar" onClick={() => onAgregar(plato)} aria-label={`Agregar ${plato.nombre}`}>
            +
          </button>
        </div>
      </div>
    </article>
  );
}
