// =====================================================================
//  MasPedidos.jsx — Carrusel horizontal "Lo más pedido"
//  Los datos vienen de la VISTA v_platos_mas_pedidos de PostgreSQL.
// =====================================================================
import FotoPlato from './FotoPlato.jsx';

export default function MasPedidos({ platos, onAgregar }) {
  if (platos.length === 0) return null;   // si nadie pidió nada aún, no se muestra

  return (
    <section className="seccion">
      <h2 className="seccion-titulo">Lo más pedido</h2>
      <div className="mas-pedidos">
        {platos.map((plato, i) => (
          <article key={plato.id} className="mas-pedido">
            <div className="mas-pedido-foto">
              <FotoPlato src={plato.imagen_url} alt={plato.nombre} />
              <span className="mas-pedido-puesto">#{i + 1}</span>
            </div>
            <div className="mas-pedido-cuerpo">
              <p className="mas-pedido-nombre">{plato.nombre}</p>
              <p className="mas-pedido-veces">{plato.veces_pedido} pedidos</p>
              <div className="mas-pedido-pie">
                <span className="precio">S/ {plato.precio.toFixed(2)}</span>
                <button className="boton-agregar" onClick={() => onAgregar(plato)} aria-label={`Agregar ${plato.nombre}`}>
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
