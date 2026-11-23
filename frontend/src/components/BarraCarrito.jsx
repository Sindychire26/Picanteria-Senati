// =====================================================================
//  BarraCarrito.jsx — Barra fija abajo: "3 platos · S/ 72.00  Ver carrito"
//  Solo aparece si hay algo en el carrito.
// =====================================================================
import { Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext.jsx';

export default function BarraCarrito({ codigo }) {
  const { totalItems, total } = useCarrito();
  if (totalItems === 0) return null;

  return (
    <div className="barra-carrito">
      <Link to={`/mesa/${codigo}/carrito`} className="barra-carrito-boton">
        {/* key={totalItems}: al cambiar el número, React lo vuelve a crear
            y se repite la animación de "salto" */}
        <span key={totalItems} className="barra-carrito-cantidad">{totalItems}</span>
        <span className="barra-carrito-texto">Ver carrito</span>
        <span className="barra-carrito-total">S/ {total.toFixed(2)}</span>
      </Link>
    </div>
  );
}
