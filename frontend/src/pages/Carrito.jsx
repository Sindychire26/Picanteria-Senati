// =====================================================================
//  Carrito.jsx — REVISAR EL PEDIDO ANTES DE PAGAR
//  Subir/bajar cantidades, quitar platos y escribir notas.
//  Todo vive en CarritoContext (todavía NO se guarda en la base).
// =====================================================================
import { Link, useParams } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext.jsx';
import CabeceraPagina from '../components/CabeceraPagina.jsx';
import FotoPlato from '../components/FotoPlato.jsx';

export default function Carrito() {
  const { codigo } = useParams();
  const { items, cambiarCantidad, cambiarNota, quitar, total, totalItems, claveDe } = useCarrito();

  return (
    <>
      <CabeceraPagina titulo="Tu pedido" volverA={`/mesa/${codigo}`} />

      <main className="pagina">
        {items.length === 0 ? (
          <div className="vacio">
            <p className="vacio-titulo">Tu carrito está vacío</p>
            <p>Agrega algo rico de la carta.</p>
            <Link to={`/mesa/${codigo}`} className="boton">Ver la carta</Link>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <article key={claveDe(item)} className="item-carrito">
                <FotoPlato src={item.imagen_url} alt={item.nombre} className="item-carrito-foto" />
                <div className="item-carrito-info">
                  <div className="item-carrito-fila">
                    <h3 className="item-carrito-nombre">{item.nombre}</h3>
                    <button className="item-carrito-quitar" onClick={() => quitar(claveDe(item))}>
                      Quitar
                    </button>
                  </div>

                  <input
                    className="item-carrito-nota"
                    placeholder="Nota: sin cebolla, poco picante..."
                    maxLength={200}
                    value={item.nota}
                    onChange={(e) => cambiarNota(claveDe(item), e.target.value)}
                  />

                  <div className="item-carrito-fila">
                    {/* Contador - 2 + */}
                    <div className="contador">
                      <button onClick={() => cambiarCantidad(claveDe(item), item.cantidad - 1)} aria-label="Quitar uno">−</button>
                      <span>{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(claveDe(item), item.cantidad + 1)} aria-label="Agregar uno">+</button>
                    </div>
                    <span className="precio">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                </div>
              </article>
            ))}

            <Link to={`/mesa/${codigo}`} className="enlace-seguir">+ Agregar más platos</Link>

            <div className="resumen">
              <div className="resumen-fila">
                <span>{totalItems} {totalItems === 1 ? 'plato' : 'platos'}</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
              <div className="resumen-fila resumen-total">
                <span>Total</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <Link to={`/mesa/${codigo}/pago`} className="boton boton-grande">
              Elegir forma de pago
            </Link>
          </>
        )}
      </main>
    </>
  );
}
