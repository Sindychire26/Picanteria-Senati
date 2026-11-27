// =====================================================================
//  PlatoCard.jsx — Tarjeta de UN plato
//  Es reutilizable: Carta.jsx la dibuja una vez por cada plato.
// =====================================================================
import FotoPlato from './FotoPlato.jsx';
import PrecioAgregar from './PrecioAgregar.jsx';
import Picante from './Picante.jsx';

export default function PlatoCard({ plato, onAgregar }) {
  return (
    <article className="plato">
      <FotoPlato src={plato.imagen_url} alt={plato.nombre} className="plato-foto" />

      <div className="plato-info">
        <h3 className="plato-nombre">{plato.nombre}</h3>
        <Picante nivel={plato.picante} />
        <p className="plato-descripcion">{plato.descripcion}</p>
        {/* Precio y botón + (o Vaso / Jarra si es una bebida con dos tamaños) */}
        <PrecioAgregar plato={plato} onAgregar={onAgregar} />
      </div>
    </article>
  );
}
