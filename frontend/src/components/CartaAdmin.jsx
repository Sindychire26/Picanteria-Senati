// =====================================================================
//  CartaAdmin.jsx — PESTAÑA "CARTA" DEL ADMINISTRADOR
//  · Buscador + botones de categoría para encontrar un plato rápido
//  · Platos agrupados por categoría, en filas tipo tabla
//  · Clic en la FOTO → elegir otra de la galería (solo cambia la foto)
//  · Precio, disponible (interruptor), editar y eliminar
// =====================================================================
import { useRef, useState } from 'react';
import { actualizarPlato, eliminarPlato, subirFoto } from '../services/api.js';
import { achicarFoto } from '../services/fotos.js';
import { normalizar } from './Buscador.jsx';
import FotoPlato from './FotoPlato.jsx';
import FormPlato from './FormPlato.jsx';
import { IconoBuscar } from './Iconos.jsx';
import Picante from './Picante.jsx';
import GestionCategorias from './GestionCategorias.jsx';

export default function CartaAdmin({ platos, categorias, onCambio, onCambioCategorias, onAviso, onError }) {
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState('todas');   // id de categoría o 'todas'
  const [precios, setPrecios] = useState({});            // precios que se están escribiendo
  const [formulario, setFormulario] = useState(null);    // null · 'nuevo' · {plato}
  const [porEliminar, setPorEliminar] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(null); // id del plato cuya foto se sube
  const [verCategorias, setVerCategorias] = useState(false); // ventana de categorías abierta
  const inputFoto = useRef(null);                        // UN solo <input file> para todas las filas
  const platoFoto = useRef(null);                        // a qué plato va la foto elegida

  // ---------- Filtrar: por categoría y por texto ----------
  const consulta = normalizar(texto);
  const visibles = platos.filter((p) =>
    (categoria === 'todas' || p.categoria_id === categoria) &&
    (!consulta || normalizar(`${p.nombre} ${p.descripcion || ''}`).includes(consulta))
  );
  const cuantos = (id) => platos.filter((p) => p.categoria_id === id).length;

  // ---------- Solo cambiar la FOTO ----------
  function elegirFoto(plato) {
    platoFoto.current = plato;
    inputFoto.current.value = '';        // para poder elegir la misma foto dos veces
    inputFoto.current.click();           // abre la galería
  }

  async function fotoElegida(e) {
    const archivo = e.target.files[0];
    const plato = platoFoto.current;
    if (!archivo || !plato) return;
    setSubiendoFoto(plato.id);
    try {
      const imagen = await achicarFoto(archivo);          // 1. achicar en el navegador
      const { url } = await subirFoto(imagen);            // 2. guardar la foto en la base
      await actualizarPlato(plato.id, { imagen_url: url }); // 3. el plato apunta a la foto nueva
      onAviso(`Foto de "${plato.nombre}" actualizada`);
      onCambio();
    } catch (err) {
      onError(err.message);
    }
    setSubiendoFoto(null);
  }

  // ---------- Precio, disponible y eliminar ----------
  async function guardarPrecio(plato) {
    const nuevo = Number(precios[plato.id]);
    if (!(nuevo > 0)) return onError('Escribe un precio válido');
    try {
      await actualizarPlato(plato.id, { precio: nuevo });
      setPrecios((p) => { const copia = { ...p }; delete copia[plato.id]; return copia; });
      onAviso(`Precio de "${plato.nombre}" guardado`);
      onCambio();
    } catch (err) {
      onError(err.message);
    }
  }

  async function cambiarDisponible(plato) {
    try {
      await actualizarPlato(plato.id, { disponible: !plato.disponible });
      onCambio();
    } catch (err) {
      onError(err.message);
    }
  }

  async function borrar(plato) {
    try {
      const r = await eliminarPlato(plato.id);
      setPorEliminar(null);
      onAviso(r.modo === 'ocultado'
        ? `"${plato.nombre}" ya tenía pedidos: se ocultó para no perder el historial`
        : `"${plato.nombre}" eliminado`);
      onCambio();
    } catch (err) {
      onError(err.message);
    }
  }

  // Una fila de la tabla. Es una función normal (no un componente <Fila/>):
  // si fuera componente definido aquí dentro, React lo "rearmaría" en cada
  // tecla y el campo de precio perdería el foco al escribir.
  function fila(p) {
    const escribiendo = precios[p.id] !== undefined && Number(precios[p.id]) !== p.precio;
    return (
      <li key={p.id} className={`carta-fila ${p.disponible ? '' : 'apagado'}`}>
        {/* La foto es un botón: clic = cambiar solo la foto */}
        <button className="carta-foto" onClick={() => elegirFoto(p)} disabled={subiendoFoto === p.id}
          title="Cambiar foto" aria-label={`Cambiar foto de ${p.nombre}`}>
          <FotoPlato src={p.imagen_url} alt="" />
          <span className="carta-foto-capa">{subiendoFoto === p.id ? 'Subiendo...' : 'Cambiar'}</span>
        </button>

        <div className="carta-info">
          <p className="carta-nombre">{p.nombre}</p>
          <p className="carta-detalle">
            {categoria === 'todas' && consulta ? `${p.categoria} · ` : ''}
            {p.veces_pedido} {p.veces_pedido === 1 ? 'pedido' : 'pedidos'}
            {p.precio_grande && <span className="carta-jarra">{p.nombre_chico} / {p.nombre_grande} S/ {p.precio_grande.toFixed(2)}</span>}
            <Picante nivel={p.picante} />
            {!p.disponible && <span className="carta-agotado">No disponible</span>}
          </p>
        </div>

        <div className="carta-precio">
          <span>S/</span>
          <input inputMode="decimal" aria-label={`Precio de ${p.nombre}`}
            value={precios[p.id] ?? p.precio.toFixed(2)}
            onChange={(e) => setPrecios({ ...precios, [p.id]: e.target.value.replace(/[^\d.]/g, '') })}
            onKeyDown={(e) => e.key === 'Enter' && escribiendo && guardarPrecio(p)} />
          {escribiendo && <button className="boton-chico activo" onClick={() => guardarPrecio(p)}>Guardar</button>}
        </div>

        <button className={`interruptor ${p.disponible ? 'encendido' : ''}`} onClick={() => cambiarDisponible(p)}
          role="switch" aria-checked={p.disponible} aria-label={`${p.nombre} disponible`}
          title={p.disponible ? 'Disponible' : 'No disponible'}>
          <span />
        </button>

        <div className="carta-acciones">
          {porEliminar === p.id ? (
            <>
              <button className="boton-chico peligro" onClick={() => borrar(p)}>Sí, eliminar</button>
              <button className="boton-chico" onClick={() => setPorEliminar(null)}>No</button>
            </>
          ) : (
            <>
              <button className="boton-chico" onClick={() => setFormulario(p)}>Editar</button>
              <button className="boton-chico" onClick={() => setPorEliminar(p.id)}>Eliminar</button>
            </>
          )}
        </div>
      </li>
    );
  }

  // Categorías que se muestran (todas, o solo la elegida)
  const grupos = categorias
    .filter((c) => categoria === 'todas' || c.id === categoria)
    .map((c) => ({ ...c, platos: visibles.filter((p) => p.categoria_id === c.id) }))
    .filter((c) => c.platos.length > 0);

  return (
    <section className="admin-caja carta-admin">
      <div className="admin-caja-cabecera">
        <div>
          <h2 className="admin-subtitulo">Platos de la carta</h2>
          <p className="admin-nota carta-resumen">
            {platos.length} platos · {platos.filter((p) => !p.disponible).length} no disponibles ·
            haz clic en una foto para cambiarla
          </p>
        </div>
        <div className="admin-acciones">
          <button className="boton-chico" onClick={() => setVerCategorias(true)}>Categorías</button>
          <button className="boton-chico activo" onClick={() => setFormulario('nuevo')}>+ Agregar plato</button>
        </div>
      </div>

      {/* Barra de búsqueda y categorías */}
      <div className="carta-herramientas">
        <label className="carta-buscar">
          <IconoBuscar />
          <input type="search" placeholder="Buscar plato..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="carta-categorias" role="tablist" aria-label="Categorías">
          <button role="tab" aria-selected={categoria === 'todas'} className={categoria === 'todas' ? 'activa' : ''}
            onClick={() => setCategoria('todas')}>
            Todas <span>{platos.length}</span>
          </button>
          {categorias.map((c) => (
            <button key={c.id} role="tab" aria-selected={categoria === c.id} className={categoria === c.id ? 'activa' : ''}
              onClick={() => setCategoria(c.id)}>
              {c.nombre} <span>{cuantos(c.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {grupos.length === 0 && <p className="admin-vacio">No hay platos que coincidan con "{texto}".</p>}

      {grupos.map((g) => (
        <div key={g.id} className="carta-grupo">
          <h3 className="carta-grupo-titulo">{g.nombre} <span>{g.platos.length}</span></h3>
          <div className="carta-columnas" aria-hidden="true">
            <span>Foto</span><span>Plato</span><span>Precio</span><span>Disponible</span><span>Acciones</span>
          </div>
          <ul className="carta-lista">
            {g.platos.map(fila)}
          </ul>
        </div>
      ))}

      {/* Input escondido que abre la galería (lo usan todas las fotos) */}
      <input ref={inputFoto} type="file" accept="image/*" hidden onChange={fotoElegida} />

      {verCategorias && (
        <GestionCategorias onCerrar={() => setVerCategorias(false)} onCambio={onCambioCategorias} />
      )}

      {formulario && (
        <FormPlato
          plato={formulario === 'nuevo' ? null : formulario}
          categorias={categorias}
          onCerrar={() => setFormulario(null)}
          onGuardado={(texto) => { setFormulario(null); onAviso(texto); onCambio(); }}
        />
      )}
    </section>
  );
}
