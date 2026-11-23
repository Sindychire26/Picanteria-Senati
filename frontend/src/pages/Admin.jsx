// =====================================================================
//  Admin.jsx — PANEL DE ADMINISTRACIÓN (solo rol "admin")
//  3 pestañas:
//   · Resumen: ventas de hoy, pedidos, ticket promedio, métodos de pago,
//              lo más vendido y lo que está en curso
//   · Movimientos: cada pedido con su pago, quién cobró y quién entregó
//   · Carta: activar/desactivar platos y cambiar precios
//  Se actualiza en tiempo real cuando llegan o cambian pedidos.
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  obtenerResumen, obtenerMovimientos, obtenerPlatosAdmin, actualizarPlato,
} from '../services/api.js';
import { obtenerSesion, cerrarSesion } from '../services/sesion.js';
import { socket } from '../services/socket.js';
import Logo from '../components/Logo.jsx';

const soles = (n) => `S/ ${Number(n).toFixed(2)}`;
const NOMBRE_METODO = { yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', efectivo: 'Efectivo' };
const ESTADOS = {
  pendiente_pago: 'Por cobrar', pagado: 'En cola', en_preparacion: 'Cocinando',
  listo: 'Para llevar', entregado: 'Entregado', cancelado: 'Cancelado',
};

// Barras horizontales simples (un solo color; el valor va escrito al lado)
function Barras({ filas, etiqueta, valor, texto }) {
  const maximo = Math.max(...filas.map(valor), 1);
  if (filas.length === 0) return <p className="admin-vacio">Todavía no hay datos hoy.</p>;
  return (
    <ul className="barras">
      {filas.map((f) => (
        <li key={etiqueta(f)} title={`${etiqueta(f)}: ${texto(f)}`}>
          <span className="barras-etiqueta">{etiqueta(f)}</span>
          <span className="barras-pista">
            <span className="barras-relleno" style={{ width: `${(valor(f) / maximo) * 100}%` }} />
          </span>
          <span className="barras-valor">{texto(f)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const esAdmin = sesion?.usuario.rol === 'admin';

  const [pestana, setPestana] = useState('resumen');
  const [resumen, setResumen] = useState(null);
  const [movs, setMovs] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [precios, setPrecios] = useState({});        // precios que se están editando
  const [guardado, setGuardado] = useState(null);    // id del plato recién guardado
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [r, m, p] = await Promise.all([obtenerResumen(), obtenerMovimientos(), obtenerPlatosAdmin()]);
      setResumen(r);
      setMovs(m);
      setPlatos(p);
      setError('');
    } catch (e) {
      if (!obtenerSesion()) return navigate('/personal/login', { replace: true });
      setError(e.message);
    }
  }, [navigate]);

  useEffect(() => {
    if (!esAdmin) return;
    cargar();
    // Tiempo real: cualquier pedido nuevo o cambio de estado actualiza los números
    socket.on('pedido:nuevo', cargar);
    socket.on('pedido:actualizado', cargar);
    return () => {
      socket.off('pedido:nuevo', cargar);
      socket.off('pedido:actualizado', cargar);
    };
  }, [cargar, esAdmin]);

  if (!esAdmin) return <Navigate to="/personal/login" replace />;

  async function cambiarDisponible(plato) {
    try {
      await actualizarPlato(plato.id, { disponible: !plato.disponible });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function guardarPrecio(plato) {
    const nuevo = Number(precios[plato.id]);
    if (!(nuevo > 0)) return setError('Escribe un precio válido');
    try {
      await actualizarPlato(plato.id, { precio: nuevo });
      setPrecios((p) => { const copia = { ...p }; delete copia[plato.id]; return copia; });
      setGuardado(plato.id);
      setTimeout(() => setGuardado(null), 1500);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  function salir() {
    cerrarSesion();
    navigate('/personal/login', { replace: true });
  }

  const enCurso = resumen?.enCurso || {};

  return (
    <div className="admin">
      <header className="panel-cabecera">
        <div className="panel-marca">
          <Logo className="panel-logo" />
          <div>
            <h1 className="panel-titulo">Administración</h1>
            <p className="panel-usuario">{sesion.usuario.nombre}</p>
          </div>
        </div>
        <div className="panel-derecha">
          <Link to="/personal" className="panel-salir">Pedidos en vivo</Link>
          <button className="panel-salir" onClick={salir}>Salir</button>
        </div>
      </header>

      <nav className="admin-pestanas">
        {[['resumen', 'Resumen de hoy'], ['movimientos', 'Movimientos'], ['carta', 'Carta']].map(([id, texto]) => (
          <button key={id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{texto}</button>
        ))}
      </nav>

      <main className="admin-contenido">
        {error && <p className="error">{error}</p>}

        {/* ------------------------- RESUMEN ------------------------- */}
        {pestana === 'resumen' && resumen && (
          <>
            <div className="admin-cifras">
              <div className="cifra cifra-destacada">
                <span className="cifra-etiqueta">Ventas de hoy</span>
                <span className="cifra-valor">{soles(resumen.ventas)}</span>
              </div>
              <div className="cifra">
                <span className="cifra-etiqueta">Pedidos</span>
                <span className="cifra-valor">{resumen.pedidos}</span>
              </div>
              <div className="cifra">
                <span className="cifra-etiqueta">Ticket promedio</span>
                <span className="cifra-valor">{soles(resumen.ticketPromedio)}</span>
              </div>
              <div className="cifra">
                <span className="cifra-etiqueta">Cancelados</span>
                <span className="cifra-valor">{resumen.cancelados}</span>
              </div>
            </div>

            <div className="admin-en-curso">
              <span>Ahora mismo:</span>
              <span className="chip-estado">{enCurso.pendiente_pago || 0} por cobrar</span>
              <span className="chip-estado">{enCurso.pagado || 0} en cola</span>
              <span className="chip-estado">{enCurso.en_preparacion || 0} cocinando</span>
              <span className="chip-estado">{enCurso.listo || 0} para llevar</span>
            </div>

            <div className="admin-dos">
              <section className="admin-caja">
                <h2 className="admin-subtitulo">Ventas por método de pago</h2>
                <Barras
                  filas={resumen.metodos}
                  etiqueta={(f) => NOMBRE_METODO[f.metodo]}
                  valor={(f) => f.total}
                  texto={(f) => `${soles(f.total)} · ${f.cantidad}`}
                />
              </section>
              <section className="admin-caja">
                <h2 className="admin-subtitulo">Lo más vendido hoy</h2>
                <Barras
                  filas={resumen.top}
                  etiqueta={(f) => f.nombre}
                  valor={(f) => f.cantidad}
                  texto={(f) => `${f.cantidad} und.`}
                />
              </section>
            </div>
            {resumen.descuentos > 0 && (
              <p className="admin-nota">Descuentos por cupones hoy: {soles(resumen.descuentos)}</p>
            )}
          </>
        )}

        {/* ------------------------- MOVIMIENTOS ------------------------- */}
        {pestana === 'movimientos' && (
          <section className="admin-caja">
            <h2 className="admin-subtitulo">Últimos 50 pedidos</h2>
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Hora</th><th>Pedido</th><th>Mesa</th><th>Cliente</th><th>Pago</th>
                    <th>Total</th><th>Estado</th><th>Cobró</th><th>Entregó</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Hora">{new Date(m.creado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</td>
                      <td data-label="Pedido"><strong>{m.codigo}</strong></td>
                      <td data-label="Mesa">{m.mesa}</td>
                      <td data-label="Cliente">{m.cliente}</td>
                      <td data-label="Pago">
                        {NOMBRE_METODO[m.metodo] || '-'}
                        {m.estado_pago === 'reembolsado' && <span className="tabla-nota"> (reembolsado)</span>}
                      </td>
                      <td data-label="Total">
                        {soles(m.total)}
                        {m.descuento > 0 && <span className="tabla-nota"> (-{soles(m.descuento)})</span>}
                      </td>
                      <td data-label="Estado"><span className={`estado estado-${m.estado}`}>{ESTADOS[m.estado]}</span></td>
                      <td data-label="Cobró">{m.cajero || (m.metodo && m.metodo !== 'efectivo' ? 'En línea' : '-')}</td>
                      <td data-label="Entregó">{m.mesero || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ------------------------- CARTA ------------------------- */}
        {pestana === 'carta' && (
          <section className="admin-caja">
            <h2 className="admin-subtitulo">Platos de la carta</h2>
            <p className="admin-nota">
              Desactiva un plato cuando se acabe (o el adobo, que es solo de domingo): desaparece
              al instante de la carta de los clientes y Misti deja de recomendarlo.
            </p>
            <ul className="admin-platos">
              {platos.map((p) => (
                <li key={p.id} className={p.disponible ? '' : 'apagado'}>
                  <div className="admin-plato-info">
                    <p className="admin-plato-nombre">{p.nombre}</p>
                    <p className="admin-plato-detalle">{p.categoria} · pedido {p.veces_pedido} {p.veces_pedido === 1 ? 'vez' : 'veces'}</p>
                  </div>
                  <div className="admin-plato-precio">
                    <span>S/</span>
                    <input
                      inputMode="decimal"
                      value={precios[p.id] ?? p.precio.toFixed(2)}
                      onChange={(e) => setPrecios({ ...precios, [p.id]: e.target.value.replace(/[^\d.]/g, '') })}
                      aria-label={`Precio de ${p.nombre}`}
                    />
                    {precios[p.id] !== undefined && Number(precios[p.id]) !== p.precio && (
                      <button className="boton-chico" onClick={() => guardarPrecio(p)}>Guardar</button>
                    )}
                    {guardado === p.id && <span className="admin-guardado">Guardado</span>}
                  </div>
                  {/* Interruptor de disponible */}
                  <button
                    className={`interruptor ${p.disponible ? 'encendido' : ''}`}
                    onClick={() => cambiarDisponible(p)}
                    role="switch"
                    aria-checked={p.disponible}
                    aria-label={`${p.nombre} disponible`}
                  >
                    <span />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
