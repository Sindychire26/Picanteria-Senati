// =====================================================================
//  Admin.jsx — PANEL DE ADMINISTRACIÓN (solo rol "admin")
//  4 pestañas:
//   · Resumen: ventas de hoy, pedidos, ticket promedio, métodos de pago,
//              lo más vendido y lo que está en curso
//   · Movimientos: cada pedido con su pago, quién cobró y quién entregó
//   · Mesas: ocupadas, tiempo, consumo, estado de pedidos, QR y agregar mesas
//   · Carta: por categorías, buscador, cambiar foto, precios, disponibilidad,
//            agregar, editar y eliminar platos (ver components/CartaAdmin.jsx)
//  Se actualiza en tiempo real cuando llegan o cambian pedidos.
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  obtenerResumen, obtenerMovimientos, obtenerPlatosAdmin, obtenerCategorias, agregarMesa,
} from '../services/api.js';
import { obtenerSesion, cerrarSesion } from '../services/sesion.js';
import { socket } from '../services/socket.js';
import Logo from '../components/Logo.jsx';
import { RESTAURANTE } from '../config.js';
import MesasPersonal from '../components/MesasPersonal.jsx';
import ModalQR from '../components/ModalQR.jsx';
import CartaAdmin from '../components/CartaAdmin.jsx';

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

// Las secciones del menú lateral: [id, texto]
const SECCIONES = [['resumen', 'Resumen de hoy'], ['movimientos', 'Movimientos'], ['mesas', 'Mesas'], ['carta', 'Carta']];

export default function Admin() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const esAdmin = sesion?.usuario.rol === 'admin';

  const [pestana, setPestana] = useState('resumen');
  const [resumen, setResumen] = useState(null);
  const [movs, setMovs] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');             // mensaje verde de "listo"
  const [categorias, setCategorias] = useState([]);
  const [mesaQR, setMesaQR] = useState(null);

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
    obtenerCategorias().then(setCategorias).catch(() => {});
    // Tiempo real: cualquier pedido nuevo o cambio de estado actualiza los números
    socket.on('pedido:nuevo', cargar);
    socket.on('pedido:actualizado', cargar);
    return () => {
      socket.off('pedido:nuevo', cargar);
      socket.off('pedido:actualizado', cargar);
    };
  }, [cargar, esAdmin]);

  if (!esAdmin) return <Navigate to="/personal/login" replace />;

  // Muestra un mensaje verde por unos segundos
  function avisar(texto) {
    setAviso(texto);
    setTimeout(() => setAviso(''), 3500);
  }

  async function nuevaMesa() {
    try {
      const mesa = await agregarMesa();
      avisar(`Mesa ${mesa.numero} agregada. Ya puedes imprimir su QR.`);
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
      {/* Menú lateral (en el celular se vuelve una barra arriba) */}
      <aside className="admin-lateral">
        <div className="admin-marca">
          <Logo className="admin-logo" />
          <div>
            <p className="admin-marca-nombre">{RESTAURANTE.nombre}</p>
            <p className="admin-marca-ayuda">Panel de administración</p>
          </div>
        </div>
        <nav className="admin-menu">
          {SECCIONES.map(([id, texto]) => (
            <button key={id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}
              aria-current={pestana === id ? 'page' : undefined}>
              {texto}
            </button>
          ))}
          <Link to="/personal" className="admin-menu-enlace">Pedidos en vivo</Link>
        </nav>
        <div className="admin-usuario">
          {sesion.usuario.nombre} · <button onClick={salir}>Salir</button>
        </div>
      </aside>

      <main className="admin-contenido">
        <h1 className="admin-titulo">{SECCIONES.find(([id]) => id === pestana)[1]}</h1>
        {error && <p className="error">{error}</p>}
        {aviso && <p className="aviso-exito">{aviso}</p>}

        {/* ------------------------- MESAS ------------------------- */}
        {pestana === 'mesas' && (
          <section className="admin-caja">
            <div className="admin-caja-cabecera">
              <h2 className="admin-subtitulo">Mesas del local</h2>
              <div className="admin-acciones">
                <Link to="/personal/qr" className="boton-chico">Imprimir todos los QR</Link>
                <button className="boton-chico activo" onClick={nuevaMesa}>+ Agregar mesa</button>
              </div>
            </div>
            <p className="admin-nota">
              Una mesa se ocupa cuando escanean su QR. Si en 15 minutos no piden nada, se libera sola;
              si ya pidieron, el mesero la libera cuando los clientes se van.
            </p>
            <MesasPersonal onVerQR={setMesaQR} />
          </section>
        )}

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
              <span className="chip-estado estado-pendiente_pago">{enCurso.pendiente_pago || 0} por cobrar</span>
              <span className="chip-estado estado-pagado">{enCurso.pagado || 0} en cola</span>
              <span className="chip-estado estado-en_preparacion">{enCurso.en_preparacion || 0} cocinando</span>
              <span className="chip-estado estado-listo">{enCurso.listo || 0} para llevar</span>
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
          <CartaAdmin
            platos={platos}
            categorias={categorias}
            onCambio={cargar}
            onAviso={avisar}
            onError={setError}
          />
        )}
      </main>

      {mesaQR && <ModalQR mesa={mesaQR} onCerrar={() => setMesaQR(null)} />}
    </div>
  );
}
