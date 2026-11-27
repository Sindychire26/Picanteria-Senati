// =====================================================================
//  PanelMesero.jsx — PANTALLA DEL MESERO (pensada para el celular)
//  Dos pestañas en la cabecera:
//   · "Para llevar": pedidos listos, con el número de MESA bien grande
//   · "Mesas": estado de cada mesa y el botón para liberarla
//  Abajo de "Para llevar" se ve lo que entregó hace poco.
// =====================================================================
import { useState } from 'react';
import MesasPersonal from './MesasPersonal.jsx';

const hora = (fecha) => fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export default function PanelMesero({ usuario, pedidos, onEntregar, ocupado, nuevos, reloj, onSalir }) {
  const [seccion, setSeccion] = useState('pedidos');   // 'pedidos' o 'mesas'
  const [entregados, setEntregados] = useState([]);    // los últimos que entregó (solo en esta sesión)

  async function entregar(pedido) {
    const ok = await onEntregar(pedido, 'entregado');
    if (ok) setEntregados((lista) => [{ ...pedido, a: new Date() }, ...lista].slice(0, 4));
  }

  const nombre = usuario.nombre.split(' ')[0];

  return (
    <div className="panel panel-mesero">
      <header className="mesero-cabecera">
        <div className="mesero-fila">
          <div>
            <p className="mesero-rol">Mesero</p>
            <h1 className="mesero-hola">Hola, {nombre}</h1>
          </div>
          <div className="mesero-derecha">
            {reloj}
            <button className="panel-salir" onClick={onSalir}>Salir</button>
          </div>
        </div>
        <div className="mesero-pestanas" role="tablist" aria-label="Secciones">
          <button role="tab" aria-selected={seccion === 'pedidos'} className={seccion === 'pedidos' ? 'activa' : ''}
            onClick={() => setSeccion('pedidos')}>
            Para llevar · {pedidos.length}
          </button>
          <button role="tab" aria-selected={seccion === 'mesas'} className={seccion === 'mesas' ? 'activa' : ''}
            onClick={() => setSeccion('mesas')}>
            Mesas
          </button>
        </div>
      </header>

      {seccion === 'mesas' && <MesasPersonal />}

      {seccion === 'pedidos' && (
        <main className="mesero-contenido">
          <p className="mesero-aviso">
            {pedidos.length === 0
              ? 'Nada para llevar por ahora. Te avisamos con un pitido.'
              : `${pedidos.length} ${pedidos.length === 1 ? 'pedido te espera' : 'pedidos te esperan'} en el mostrador`}
          </p>

          {pedidos.map((p) => (
            <article key={p.id} className={`mesero-pedido ${nuevos.includes(p.id) ? 'comanda-nueva' : ''}`}>
              <div className="mesero-pedido-fila">
                {/* La mesa en grande: es lo primero que busca el mesero */}
                <div className="mesero-mesa">
                  <span>MESA</span>
                  <strong>{p.mesa}</strong>
                </div>
                <div className="mesero-pedido-datos">
                  <div className="mesero-pedido-titulo">
                    <span className="mesero-codigo">{p.codigo}</span>
                    <span className="mesero-hace">Hace {p.minutos} min</span>
                  </div>
                  <ul className="mesero-items">
                    {p.items.map((it, i) => (
                      <li key={i}><strong>{it.cantidad}×</strong> {it.nombre}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button className="mesero-entregar" onClick={() => entregar(p)} disabled={ocupado === p.id}>
                {ocupado === p.id ? 'Guardando...' : 'Entregado en la mesa'}
              </button>
            </article>
          ))}

          {entregados.length > 0 && (
            <section className="mesero-recientes">
              <h2>Entregaste hace poco</h2>
              {entregados.map((p) => (
                <div key={`${p.id}-${p.a.getTime()}`}>
                  <span><strong>{p.codigo}</strong> · Mesa {p.mesa}</span>
                  <span>{hora(p.a)}</span>
                </div>
              ))}
            </section>
          )}
        </main>
      )}
    </div>
  );
}
