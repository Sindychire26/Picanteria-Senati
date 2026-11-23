// =====================================================================
//  MisPedidos.jsx — LOS PEDIDOS DE MI MESA
//  - Muestra cada pedido con su estado (estilo seguimiento de delivery)
//  - Se actualiza EN TIEMPO REAL con Socket.IO
//  - Permite CANCELAR si la cocina todavía no empezó
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { obtenerPedidosDeCuenta, cancelarPedido } from '../services/api.js';
import { obtenerCuenta } from '../services/cuenta.js';
import { socket } from '../services/socket.js';
import CabeceraPagina from '../components/CabeceraPagina.jsx';

// Texto para cada estado
const ESTADOS = {
  pendiente_pago: 'Esperando pago en caja',
  pagado: 'Recibido',
  en_preparacion: 'En preparación',
  listo: '¡Listo! Ya te lo llevan',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Pasos de la barra de progreso
const PASOS = ['pagado', 'en_preparacion', 'listo', 'entregado'];
const NOMBRE_PASO = { pagado: 'Recibido', en_preparacion: 'Cocinando', listo: 'Listo', entregado: 'Entregado' };

const SE_PUEDE_CANCELAR = ['pendiente_pago', 'pagado'];

export default function MisPedidos() {
  const { codigo } = useParams();
  const [params] = useSearchParams();
  const nuevo = Number(params.get('nuevo'));        // id del pedido recién hecho
  const cuponGanado = Number(params.get('cupon'));  // % del cupón que ganó (clientes registrados)
  const cuentaId = obtenerCuenta(codigo);

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(null);  // id del pedido a cancelar

  // useCallback: guarda la función para poder usarla en el useEffect
  const cargar = useCallback(async () => {
    if (!cuentaId) return setCargando(false);
    try {
      setPedidos(await obtenerPedidosDeCuenta(cuentaId));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [cuentaId]);

  // Cargar al entrar y luego EN TIEMPO REAL: cuando cocina, mesero o caja
  // cambian un pedido de ESTA cuenta, el backend avisa y recargamos
  useEffect(() => {
    cargar();
    function alCambiar(pedido) {
      if (pedido.cuenta_id === cuentaId) cargar();
    }
    socket.on('pedido:actualizado', alCambiar);
    return () => socket.off('pedido:actualizado', alCambiar);
  }, [cargar, cuentaId]);

  async function cancelar(pedidoId) {
    try {
      await cancelarPedido(pedidoId);
    } catch (e) {
      setError(e.message);
    }
    setConfirmando(null);
    cargar();
  }

  return (
    <>
      <CabeceraPagina titulo="Mis pedidos" volverA={`/mesa/${codigo}`} />

      <main className="pagina">
        {nuevo > 0 && (
          <div className="aviso-exito">
            <p className="aviso-exito-titulo">¡Pedido recibido!</p>
            <p>Puedes seguir su estado aquí.</p>
          </div>
        )}

        {cuponGanado > 0 && (
          <div className="aviso-cupon">
            <p className="aviso-exito-titulo">¡Ganaste {cuponGanado}% de descuento!</p>
            <p>Se aplicará en tu próximo pedido. Lo verás en "Mi cuenta".</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {cargando && <p className="buscador-ayuda">Cargando...</p>}

        {!cargando && pedidos.length === 0 && (
          <div className="vacio">
            <p className="vacio-titulo">Aún no has hecho pedidos</p>
            <Link to={`/mesa/${codigo}`} className="boton">Ver la carta</Link>
          </div>
        )}

        {pedidos.map((p) => {
          const paso = PASOS.indexOf(p.estado);   // -1 si está pendiente o cancelado
          return (
            <article key={p.id} className={`pedido ${p.id === nuevo ? 'pedido-nuevo' : ''}`}>
              <div className="pedido-cabecera">
                <div>
                  <p className="pedido-codigo">Pedido {p.codigo}</p>
                  <p className="pedido-hora">
                    {new Date(p.creado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{p.metodo_pago}
                  </p>
                </div>
                <span className={`estado estado-${p.estado}`}>{ESTADOS[p.estado]}</span>
              </div>

              {/* Pago en efectivo pendiente: indicación para ir a caja */}
              {p.estado === 'pendiente_pago' && (
                <div className="aviso-caja">
                  <p>Acércate a caja y di tu código</p>
                  <p className="aviso-caja-codigo">{p.codigo}</p>
                  <p>Total: <strong>S/ {p.total.toFixed(2)}</strong></p>
                </div>
              )}

              {/* Barra de progreso */}
              {paso >= 0 && (
                <ol className="progreso">
                  {PASOS.map((nombre, i) => (
                    <li key={nombre} className={i <= paso ? 'hecho' : ''}>{NOMBRE_PASO[nombre]}</li>
                  ))}
                </ol>
              )}

              <ul className="pedido-items">
                {p.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {item.cantidad} × {item.nombre}
                      {item.nota && !item.es_regalo && <em> ({item.nota})</em>}
                    </span>
                    <span>{item.es_regalo ? 'Gratis' : `S/ ${(item.precio * item.cantidad).toFixed(2)}`}</span>
                  </li>
                ))}
              </ul>

              <div className="pedido-pie">
                <span className="pedido-total">
                  Total S/ {p.total.toFixed(2)}
                  {p.descuento > 0 && <span className="pedido-ahorro"> (ahorraste S/ {p.descuento.toFixed(2)})</span>}
                </span>

                {SE_PUEDE_CANCELAR.includes(p.estado) && (
                  confirmando === p.id ? (
                    <div className="confirmar">
                      <span>¿Cancelar?</span>
                      <button className="boton-chico peligro" onClick={() => cancelar(p.id)}>Sí</button>
                      <button className="boton-chico" onClick={() => setConfirmando(null)}>No</button>
                    </div>
                  ) : (
                    <button className="boton-chico" onClick={() => setConfirmando(p.id)}>Cancelar pedido</button>
                  )
                )}
              </div>

              {p.estado === 'cancelado' && p.estado_pago === 'reembolsado' && (
                <p className="pedido-nota">Se devolvió el dinero a tu {p.metodo_pago} (simulado).</p>
              )}
            </article>
          );
        })}

        {pedidos.length > 0 && (
          <Link to={`/mesa/${codigo}`} className="boton boton-grande boton-secundario">
            Pedir algo más
          </Link>
        )}
      </main>
    </>
  );
}
