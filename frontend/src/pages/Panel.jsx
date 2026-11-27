// =====================================================================
//  Panel.jsx — PANTALLA DEL PERSONAL (una sola página para todos)
//  Según el ROL del usuario muestra columnas distintas:
//    cocina → "En cola" y "En el fogón", un resumen arriba y los
//             listos del mostrador abajo
//    mesero → su propia pantalla (PanelMesero.jsx): para llevar y mesas
//    caja   → "Por cobrar" (con buscador de código)
//    admin  → todo
//  Se actualiza EN TIEMPO REAL con Socket.IO.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { obtenerPedidosPersonal, cambiarEstadoPedido, obtenerMasPedidos } from '../services/api.js';
import { obtenerSesion, cerrarSesion } from '../services/sesion.js';
import { socket } from '../services/socket.js';
import TarjetaPedidoPersonal from '../components/TarjetaPedidoPersonal.jsx';
import PanelMesero from '../components/PanelMesero.jsx';
import Logo from '../components/Logo.jsx';
import { RESTAURANTE } from '../config.js';

// Configuración de cada rol: título y columnas (qué estado muestra y qué botón tiene)
const COLUMNAS = {
  pendiente_pago: { titulo: 'Por cobrar', ayuda: 'Pagos en efectivo',      accion: { estado: 'pagado', texto: 'Confirmar pago' } },
  pagado:         { titulo: 'En cola', ayuda: 'Esperando a la cocina',     accion: { estado: 'en_preparacion', texto: 'Empezar a preparar' } },
  en_preparacion: { titulo: 'En el fogón', ayuda: 'Se están cocinando',    accion: { estado: 'listo', texto: 'Listo para servir' } },
  listo:          { titulo: 'Para llevar', ayuda: 'Listos en el mostrador', accion: { estado: 'entregado', texto: 'Entregado en la mesa' } },
};
const VISTA_ROL = {
  cocina: { titulo: 'Cocina', estados: ['pagado', 'en_preparacion'], mostrador: true },
  mesero: { titulo: 'Meseros', estados: ['listo'] },
  caja:   { titulo: 'Caja', estados: ['pendiente_pago'] },
  admin:  { titulo: 'Administración', estados: ['pendiente_pago', 'pagado', 'en_preparacion', 'listo'] },
};

// Reloj que se actualiza cada segundo (componente propio para no redibujar todo el panel)
function Reloj() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="panel-reloj">{ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span>;
}

// Pitido corto cuando llega algo nuevo (Web Audio API, sin archivos de sonido)
function pitido() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* si el navegador no deja, no pasa nada */ }
}

export default function Panel() {
  const navigate = useNavigate();
  const sesion = obtenerSesion();
  const vista = VISTA_ROL[sesion?.usuario.rol];

  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(null);       // id del pedido que se está guardando
  const [nuevos, setNuevos] = useState([]);           // ids recién llegados (para resaltarlos)
  const [buscar, setBuscar] = useState('');           // buscador de código (caja)
  const [estrella, setEstrella] = useState(null);     // cocina: el plato más pedido
  const conocidos = useRef(null);                     // ids que ya vimos (null = primera carga)

  const cargar = useCallback(async () => {
    try {
      const lista = await obtenerPedidosPersonal();
      // ¿Hay pedidos que no estaban antes? → resaltarlos y sonar
      if (conocidos.current) {
        const llegaron = lista.filter((p) => !conocidos.current.has(`${p.id}-${p.estado}`)).map((p) => p.id);
        if (llegaron.length > 0) {
          setNuevos(llegaron);
          pitido();
        }
      }
      conocidos.current = new Set(lista.map((p) => `${p.id}-${p.estado}`));
      setPedidos(lista);
      setError('');
    } catch (e) {
      if (!obtenerSesion()) return navigate('/personal/login', { replace: true });  // sesión vencida
      setError(e.message);
    }
  }, [navigate]);

  useEffect(() => {
    if (!vista) return;
    cargar();
    if (vista.mostrador) obtenerMasPedidos(1).then((lista) => setEstrella(lista[0] || null)).catch(() => {});
    // TIEMPO REAL: cuando el backend avisa, volvemos a pedir la lista
    socket.on('pedido:nuevo', cargar);
    socket.on('pedido:actualizado', cargar);
    // Y cada minuto, para actualizar los "hace X min"
    const id = setInterval(cargar, 60000);
    return () => {                       // limpieza al salir de la página
      socket.off('pedido:nuevo', cargar);
      socket.off('pedido:actualizado', cargar);
      clearInterval(id);
    };
  }, [cargar, vista]);

  if (!sesion || !vista) return <Navigate to="/personal/login" replace />;

  // Cambia el estado de un pedido. Devuelve true si se guardó.
  async function avanzar(pedido, estado) {
    setOcupado(pedido.id);
    let ok = true;
    try {
      await cambiarEstadoPedido(pedido.id, estado);
    } catch (e) {
      setError(e.message);
      ok = false;
    }
    setOcupado(null);
    cargar();
    return ok;
  }

  function salir() {
    cerrarSesion();
    navigate('/personal/login', { replace: true });
  }

  // El mesero tiene su propia pantalla, pensada para el celular
  if (sesion.usuario.rol === 'mesero') {
    return (
      <PanelMesero usuario={sesion.usuario} pedidos={pedidos} onEntregar={avanzar}
        ocupado={ocupado} nuevos={nuevos} reloj={<Reloj />} onSalir={salir} />
    );
  }

  // Cocina: números para la franja de resumen
  const enCocina = pedidos.filter((p) => p.estado === 'pagado' || p.estado === 'en_preparacion');
  const listos = pedidos.filter((p) => p.estado === 'listo');
  const promedio = enCocina.length
    ? Math.round(enCocina.reduce((suma, p) => suma + p.minutos, 0) / enCocina.length)
    : 0;
  const urgentes = enCocina.filter((p) => p.minutos >= 15).length;

  // Caja: filtrar por código escrito (A5, a5, 5...)
  const filtro = buscar.trim().toUpperCase().replace(/^A?/, 'A');
  const visibles = buscar.trim() ? pedidos.filter((p) => p.codigo.startsWith(filtro)) : pedidos;

  return (
    <div className={`panel panel-${sesion.usuario.rol}`}>
      <header className="panel-cabecera">
        <div className="panel-marca">
          <Logo className="panel-logo" />
          <div>
            <h1 className="panel-titulo">{vista.titulo}</h1>
            <p className="panel-usuario">
              <span className="panel-restaurante">{RESTAURANTE.nombre} · </span>{sesion.usuario.nombre}
            </p>
          </div>
        </div>
        <div className="panel-derecha">
          <Reloj />
          {sesion.usuario.rol === 'admin' && (
            <Link to="/personal/admin" className="panel-salir">Ventas y carta</Link>
          )}
          <button className="panel-salir" onClick={salir}>Salir</button>
        </div>
      </header>

      {error && <p className="error panel-error">{error}</p>}

      {/* Cocina: resumen rápido arriba */}
      {vista.mostrador && (
        <div className="panel-resumen">
          <span>{enCocina.length} por preparar</span>
          <span>Tiempo promedio: {promedio} min</span>
          {urgentes > 0 && (
            <span className="alerta">{urgentes} {urgentes === 1 ? 'pedido pasa' : 'pedidos pasan'} de 15 min</span>
          )}
          {estrella && <span>Estrella de la casa: {estrella.nombre}</span>}
        </div>
      )}

      {sesion.usuario.rol === 'caja' && (
        <input className="panel-buscar" placeholder="Buscar código del cliente (ej: A5)"
          value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      )}

      <div className="panel-columnas">
        {vista.estados.map((estado) => {
          const columna = COLUMNAS[estado];
          const lista = visibles.filter((p) => p.estado === estado);
          return (
            <section key={estado} className="panel-columna">
              <div className={`panel-columna-cabecera columna-${estado}`}>
                <div>
                  <h2 className="panel-columna-titulo">{columna.titulo}</h2>
                  <p className="panel-columna-ayuda">{columna.ayuda}</p>
                </div>
                <span className="panel-contador">{lista.length}</span>
              </div>
              {lista.length === 0 && <p className="panel-vacio">Todo tranquilo por aquí</p>}
              <div className="panel-columna-lista">
              {lista.map((p) => (
                <TarjetaPedidoPersonal
                  key={p.id}
                  pedido={p}
                  accion={columna.accion}
                  onAccion={avanzar}
                  ocupado={ocupado === p.id}
                  nuevo={nuevos.includes(p.id)}
                />
              ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Cocina: lo que ya está listo, esperando al mesero */}
      {vista.mostrador && (
        <section className="panel-mostrador">
          <h2>Listos en el mostrador</h2>
          {listos.length === 0 && <span className="panel-mostrador-ayuda">Ninguno por ahora</span>}
          {listos.map((p) => (
            <span key={p.id} className="panel-mostrador-item">{p.codigo} · Mesa {p.mesa}</span>
          ))}
          {listos.length > 0 && <span className="panel-mostrador-ayuda">El mesero los lleva a la mesa</span>}
        </section>
      )}
    </div>
  );
}
