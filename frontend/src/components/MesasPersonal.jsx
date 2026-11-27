// =====================================================================
//  MesasPersonal.jsx — ESTADO DE LAS MESAS PARA EL PERSONAL
//  Una tarjeta por mesa: libre u ocupada, desde hace cuánto, cuánto
//  consumió, cómo van sus pedidos y el botón "Liberar mesa".
//  Lo usan:
//   · el MESERO (en su panel)  → ve y libera
//   · el ADMIN (pestaña Mesas) → además ve el QR y puede agregar mesas
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { obtenerMesasPersonal, liberarMesa } from '../services/api.js';
import { socket } from '../services/socket.js';

const soles = (n) => `S/ ${Number(n).toFixed(2)}`;

// 75 → "1 h 15 min"
function duracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

export default function MesasPersonal({ onVerQR }) {
  const [mesas, setMesas] = useState([]);
  const [error, setError] = useState('');
  const [liberando, setLiberando] = useState(null);   // id de la mesa que se está liberando
  const [filtro, setFiltro] = useState('todas');

  const cargar = useCallback(async () => {
    try {
      setMesas(await obtenerMesasPersonal());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Cualquier cambio en mesas o pedidos cambia los números de las tarjetas
    socket.on('mesas:actualizadas', cargar);
    socket.on('pedido:nuevo', cargar);
    socket.on('pedido:actualizado', cargar);
    const id = setInterval(cargar, 60000);   // para que avance el "hace X min"
    return () => {
      socket.off('mesas:actualizadas', cargar);
      socket.off('pedido:nuevo', cargar);
      socket.off('pedido:actualizado', cargar);
      clearInterval(id);
    };
  }, [cargar]);

  async function liberar(mesa) {
    setLiberando(mesa.id);
    try {
      await liberarMesa(mesa.id);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
    setLiberando(null);
  }

  // ¿En qué está cada mesa? Se dice en palabras y con su color de estado:
  //   espera (rojo suave) · proceso (lila) · listo (azul suave)
  function situacion(m) {
    if (!m.ocupada) return { tono: 'libre', titulo: 'Libre', detalle: 'Esperando clientes' };
    const tiempo = duracion(m.minutos);
    if (m.pedidos_totales === 0) {
      return { tono: 'espera', titulo: 'Recién llegaron', detalle: `${tiempo} · aún no piden (se libera sola en ${m.libre_en} min)` };
    }
    if (m.por_cobrar + m.en_cola > 0) {
      const partes = [];
      if (m.por_cobrar) partes.push(`${m.por_cobrar} por cobrar`);
      if (m.en_cola) partes.push(`${m.en_cola} en cola de cocina`);
      return { tono: 'espera', titulo: 'Esperando su pedido', detalle: `${tiempo} · ${partes.join(', ')}` };
    }
    if (m.cocinando > 0) return { tono: 'proceso', titulo: 'Comiendo', detalle: `${tiempo} · ${m.cocinando} en el fogón` };
    if (m.para_llevar > 0) return { tono: 'proceso', titulo: 'Pedido listo', detalle: `${tiempo} · ${m.para_llevar} para llevar a la mesa` };
    return { tono: 'listo', titulo: 'Todo entregado', detalle: `${tiempo} · ${m.pedidos} ${m.pedidos === 1 ? 'pedido' : 'pedidos'}` };
  }

  const conSituacion = mesas.map((m) => ({ ...m, sit: situacion(m) }));
  const cuenta = (tono) => conSituacion.filter((m) => m.sit.tono === tono).length;
  const ocupadas = conSituacion.filter((m) => m.ocupada);
  const consumoTotal = ocupadas.reduce((suma, m) => suma + m.consumo, 0);
  const visibles = filtro === 'ocupadas' ? ocupadas : conSituacion;

  return (
    <div className="mesas-personal">
      {/* Resumen por colores */}
      <div className="mesas-chips">
        <span className="chip-espera">{cuenta('espera')} esperando</span>
        <span className="chip-proceso">{cuenta('proceso')} comiendo</span>
        <span className="chip-listo">{cuenta('listo')} para liberar</span>
        <span className="chip-libre">{cuenta('libre')} libres</span>
      </div>

      <div className="mesas-barra">
        <p className="mesas-resumen">
          {ocupadas.length > 0
            ? <>Consumo en mesas: <strong>{soles(consumoTotal)}</strong></>
            : 'Todas las mesas están libres'}
        </p>
        <div className="mesas-filtro" role="group" aria-label="Filtrar mesas">
          <button className={filtro === 'todas' ? 'activo' : ''} onClick={() => setFiltro('todas')}>Todas</button>
          <button className={filtro === 'ocupadas' ? 'activo' : ''} onClick={() => setFiltro('ocupadas')}>Solo ocupadas</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="mesas-grilla">
        {visibles.map((m) => (
          <article key={m.id} className={`mesa-tarjeta tono-${m.sit.tono}`}>
            <div className="mesa-fila">
              <div className="mesa-numero">{m.numero}</div>
              <div className="mesa-texto">
                <p className="mesa-titulo">{m.sit.titulo}</p>
                <p className="mesa-detalle">{m.sit.detalle}</p>
                {m.cliente && <p className="mesa-detalle">Cliente: {m.cliente}</p>}
              </div>
              {m.ocupada && <span className="mesa-consumo">{soles(m.consumo)}</span>}
            </div>

            {m.ocupada && (
              <button
                className="mesa-liberar"
                onClick={() => liberar(m)}
                disabled={!m.puede_liberar || liberando === m.id}
              >
                {liberando === m.id ? 'Liberando...' : m.puede_liberar ? 'Ya se fueron: liberar mesa' : 'Aún no se puede liberar'}
              </button>
            )}

            {onVerQR && (
              <button className="enlace-qr" onClick={() => onVerQR(m)}>Ver QR · {m.codigo}</button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
