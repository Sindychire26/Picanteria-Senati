// =====================================================================
//  TarjetaPedidoPersonal.jsx — Un pedido como "COMANDA" de papel
//  - La MESA en un círculo grande (se lee de lejos)
//  - Tiempo: normal (a tiempo), rojo suave (demora), rocoto (urge)
//  - La línea de arriba tiene el color de su estado (espera / proceso / listo)
//  - Los platos con su cantidad y las notas resaltadas
//  - El botón de la siguiente acción
// =====================================================================

// Color del semáforo según los minutos de espera
function semaforo(minutos) {
  if (minutos >= 15) return 'rojo';
  if (minutos >= 8) return 'ambar';
  return 'verde';
}

export default function TarjetaPedidoPersonal({ pedido, accion, onAccion, ocupado, nuevo }) {
  const color = semaforo(pedido.minutos);
  const cantidadPlatos = pedido.items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <article className={`comanda comanda-estado-${pedido.estado} ${nuevo ? 'comanda-nueva' : ''} comanda-${color}`}>
      {/* Cabecera: mesa + código + tiempo */}
      <div className="comanda-cabecera">
        <div className="comanda-mesa">
          <span className="comanda-mesa-texto">Mesa</span>
          <span className="comanda-mesa-numero">{pedido.mesa}</span>
        </div>
        <div className="comanda-datos">
          <span className="comanda-codigo">Pedido {pedido.codigo}</span>
          <span className="comanda-platos">{cantidadPlatos} {cantidadPlatos === 1 ? 'plato' : 'platos'}</span>
        </div>
        <span className={`comanda-tiempo tiempo-${color}`}>
          {pedido.minutos < 1 ? 'Nuevo' : `${pedido.minutos} min`}
        </span>
      </div>

      {/* Línea punteada, como el corte de un ticket */}
      <div className="comanda-corte" />

      <ul className="comanda-items">
        {pedido.items.map((item, i) => (
          <li key={i}>
            <span className="comanda-cantidad">{item.cantidad}</span>
            <div className="comanda-plato">
              <span>{item.nombre}</span>
              {item.es_regalo && <span className="comanda-promo">promo</span>}
              {item.nota && !item.es_regalo && <span className="comanda-nota">{item.nota}</span>}
            </div>
          </li>
        ))}
      </ul>

      {/* La caja necesita ver cuánto cobrar */}
      {pedido.estado === 'pendiente_pago' && (
        <p className="comanda-cobrar">Cobrar <strong>S/ {pedido.total.toFixed(2)}</strong></p>
      )}

      {accion && (
        <button className={`comanda-boton boton-${accion.estado}`} onClick={() => onAccion(pedido, accion.estado)} disabled={ocupado}>
          {ocupado ? 'Guardando...' : accion.texto}
        </button>
      )}
    </article>
  );
}
