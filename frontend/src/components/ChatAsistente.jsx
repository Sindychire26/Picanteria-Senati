// =====================================================================
//  ChatAsistente.jsx — "Misti", EL ASISTENTE CON IA
//  - Botón flotante que abre una ventana de chat
//  - Preguntas rápidas para no tener que escribir
//  - Cuando Misti recomienda platos, aparecen como tarjetas con
//    el botón "Agregar" que los mete DIRECTO al carrito
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { preguntarAsistente } from '../services/api.js';
import { useCarrito } from '../context/CarritoContext.jsx';
import { IconoChat, IconoCerrar, IconoEnviar } from './Iconos.jsx';
import FotoPlato from './FotoPlato.jsx';

const PREGUNTAS_RAPIDAS = [
  '¿Qué me recomiendas?',
  '¿Qué es lo más pedido?',
  'Algo no tan picante',
  'Somos 4, ¿qué pedimos para compartir?',
  '¿Qué promociones hay hoy?',
];

const SALUDO = {
  rol: 'asistente',
  texto: '¡Hola! Soy Misti. Te ayudo a elegir tu plato arequipeño. ¿Qué se te antoja?',
  platos: [],
};

export default function ChatAsistente() {
  const { agregar } = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [agregados, setAgregados] = useState([]);   // ids agregados (para mostrar "¡Listo!")
  const finRef = useRef(null);

  // Cada vez que llega un mensaje, bajamos el scroll hasta el final
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando, abierto]);

  async function enviar(pregunta) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;

    const nuevos = [...mensajes, { rol: 'usuario', texto: limpia, platos: [] }];
    setMensajes(nuevos);
    setTexto('');
    setPensando(true);

    try {
      // Mandamos la conversación (sin el saludo inicial) para que la IA tenga contexto
      const { respuesta, platos } = await preguntarAsistente(
        nuevos.slice(1).map(({ rol, texto }) => ({ rol, texto }))
      );
      setMensajes((m) => [...m, { rol: 'asistente', texto: respuesta, platos }]);
    } catch (e) {
      setMensajes((m) => [...m, { rol: 'asistente', texto: e.message, platos: [], error: true }]);
    } finally {
      setPensando(false);
    }
  }

  function agregarPlato(plato) {
    agregar(plato);
    setAgregados((a) => [...a, plato.id]);
    setTimeout(() => setAgregados((a) => a.filter((id) => id !== plato.id)), 1500);
  }

  // Solo mostramos las preguntas rápidas al inicio de la conversación
  const mostrarRapidas = mensajes.length <= 2 && !pensando;

  return (
    <>
      {!abierto && (
        <button className="chat-boton" onClick={() => setAbierto(true)} aria-label="Abrir asistente">
          <IconoChat width={26} height={26} />
          <span className="chat-boton-texto">Pregúntale a Misti</span>
        </button>
      )}

      {abierto && (
        <section className="chat" aria-label="Asistente Misti">
          <header className="chat-cabecera">
            <div className="chat-avatar">M</div>
            <div className="chat-titulo">
              <p className="chat-nombre">Misti</p>
              <p className="chat-estado">{pensando ? 'Escribiendo...' : 'Tu asistente de la picantería'}</p>
            </div>
            <button className="chat-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">
              <IconoCerrar />
            </button>
          </header>

          <div className="chat-mensajes">
            {mensajes.map((m, i) => (
              <div key={i} className={`chat-fila chat-${m.rol}`}>
                <p className={`chat-burbuja ${m.error ? 'chat-burbuja-error' : ''}`}>{m.texto}</p>

                {/* Platos recomendados → se pueden agregar al carrito sin buscarlos */}
                {m.platos?.map((plato) => (
                  <div key={plato.id} className="chat-plato">
                    <FotoPlato src={plato.imagen_url} alt={plato.nombre} className="chat-plato-foto" />
                    <div className="chat-plato-info">
                      <p className="chat-plato-nombre">{plato.nombre}</p>
                      <p className="precio">S/ {plato.precio.toFixed(2)}</p>
                    </div>
                    <button
                      className={`chat-plato-agregar ${agregados.includes(plato.id) ? 'listo' : ''}`}
                      onClick={() => agregarPlato(plato)}
                    >
                      {agregados.includes(plato.id) ? '¡Listo!' : 'Agregar'}
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {pensando && (
              <div className="chat-fila chat-asistente">
                <p className="chat-burbuja chat-puntos"><span /><span /><span /></p>
              </div>
            )}

            {mostrarRapidas && (
              <div className="chat-rapidas">
                {PREGUNTAS_RAPIDAS.map((p) => (
                  <button key={p} className="chat-rapida" onClick={() => enviar(p)}>{p}</button>
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* onSubmit: funciona con Enter o con el botón */}
          <form className="chat-entrada" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu pregunta..."
              maxLength={300}
              disabled={pensando}
            />
            <button className="chat-enviar" disabled={pensando || !texto.trim()} aria-label="Enviar">
              <IconoEnviar />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
