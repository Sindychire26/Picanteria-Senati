// =====================================================================
//  Carta.jsx — LA CARTA DEL RESTAURANTE
//  1. Lee el código de la mesa desde la URL (/mesa/M05-E9R1)
//  2. Pide al backend: mesa, categorías, platos, más pedidos y promociones
//  3. Dibuja: saludo, carrusel de promos, lo más pedido y la carta
//  4. Si el cliente usa el buscador, muestra solo los resultados
// =====================================================================
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  obtenerMesa,
  obtenerCategorias,
  obtenerPlatos,
  obtenerMasPedidos,
  obtenerPromociones,
} from '../services/api.js';
import Encabezado from '../components/Encabezado.jsx';
import Saludo from '../components/Saludo.jsx';
import CarruselPromos from '../components/CarruselPromos.jsx';
import MasPedidos from '../components/MasPedidos.jsx';
import CategoriasNav from '../components/CategoriasNav.jsx';
import Buscador, { normalizar } from '../components/Buscador.jsx';
import PlatoCard from '../components/PlatoCard.jsx';
import BarraCarrito from '../components/BarraCarrito.jsx';
import ChatAsistente from '../components/ChatAsistente.jsx';
import { useCarrito } from '../context/CarritoContext.jsx';
import { obtenerCuenta } from '../services/cuenta.js';
import { socket } from '../services/socket.js';

export default function Carta() {
  const { codigo } = useParams();          // el ":codigo" de la URL

  const [mesa, setMesa] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [masPedidos, setMasPedidos] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estado del buscador
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        setCargando(true);
        // Promise.all: hace las 5 peticiones AL MISMO TIEMPO (más rápido)
        const [m, c, p, mp, pr] = await Promise.all([
          obtenerMesa(codigo),
          obtenerCategorias(),
          obtenerPlatos(),
          obtenerMasPedidos(5),
          obtenerPromociones(),
        ]);
        setMesa(m);
        setCategorias(c);
        setPlatos(p);
        setMasPedidos(mp);
        setPromociones(pr);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [codigo]); // si cambia el código de la URL, vuelve a cargar

  // Si el admin activa/desactiva un plato o cambia un precio, la carta se actualiza sola
  useEffect(() => {
    async function recargarCarta() {
      try {
        const [p, mp] = await Promise.all([obtenerPlatos(), obtenerMasPedidos(5)]);
        setPlatos(p);
        setMasPedidos(mp);
      } catch { /* si falla, se queda la carta que ya estaba */ }
    }
    socket.on('carta:actualizada', recargarCarta);
    return () => socket.off('carta:actualizada', recargarCarta);
  }, []);

  // El botón "+" agrega al carrito (CarritoContext)
  const { agregar } = useCarrito();
  // ¿Esta mesa ya hizo pedidos? Entonces mostramos el enlace a "Mis pedidos"
  const tienePedidos = obtenerCuenta(codigo) !== null;

  function cerrarBuscador() {
    setBuscando(false);
    setTexto('');
  }

  // Filtrado: se calcula en cada render a partir de "texto" (no necesita su propio estado)
  const consulta = normalizar(texto);
  const resultados = consulta
    ? platos.filter((p) =>
        normalizar(`${p.nombre} ${p.descripcion} ${p.categoria}`).includes(consulta)
      )
    : [];

  if (cargando) return <p className="cargando">Cargando la carta...</p>;

  if (error) {
    return (
      <main className="inicio">
        <p className="error">{error}</p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </main>
    );
  }

  return (
    <>
      <Encabezado mesa={mesa} onBuscar={() => setBuscando(true)} />

      {/* Barra fija: o el buscador, o las categorías */}
      <div className="barra-fija">
        {buscando ? (
          <Buscador texto={texto} onCambiar={setTexto} onCerrar={cerrarBuscador} />
        ) : (
          <CategoriasNav categorias={categorias} />
        )}
      </div>

      <main className="carta">
        {buscando ? (
          // ---------- MODO BÚSQUEDA ----------
          <section className="seccion">
            {!consulta && <p className="buscador-ayuda">Escribe el nombre de un plato o ingrediente.</p>}

            {consulta && resultados.length === 0 && (
              <div className="sin-resultados">
                <p className="sin-resultados-titulo">No encontramos "{texto}"</p>
                <p>Prueba con "rocoto", "chupe" o "chicha".</p>
              </div>
            )}

            {resultados.length > 0 && (
              <>
                <p className="buscador-ayuda">
                  {resultados.length} {resultados.length === 1 ? 'plato encontrado' : 'platos encontrados'}
                </p>
                {resultados.map((plato) => (
                  <PlatoCard key={plato.id} plato={plato} onAgregar={agregar} />
                ))}
              </>
            )}
          </section>
        ) : (
          // ---------- MODO NORMAL ----------
          <>
            <Saludo />
            {tienePedidos && (
              <Link to={`/mesa/${codigo}/pedidos`} className="enlace-pedidos">
                Ver el estado de mis pedidos
              </Link>
            )}
            <CarruselPromos promociones={promociones} />
            <MasPedidos platos={masPedidos} onAgregar={agregar} />

            {/* Una sección por categoría, con sus platos */}
            {categorias.map((categoria) => {
              const platosDeCategoria = platos.filter((p) => p.categoria_id === categoria.id);
              if (platosDeCategoria.length === 0) return null;

              return (
                <section key={categoria.id} id={`categoria-${categoria.id}`} className="seccion">
                  <h2 className="seccion-titulo">{categoria.nombre}</h2>
                  {platosDeCategoria.map((plato) => (
                    <PlatoCard key={plato.id} plato={plato} onAgregar={agregar} />
                  ))}
                </section>
              );
            })}
          </>
        )}
      </main>

      <BarraCarrito codigo={codigo} />
      <ChatAsistente />
    </>
  );
}
