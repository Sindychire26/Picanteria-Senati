// =====================================================================
//  GestionCategorias.jsx — VENTANA PARA ADMINISTRAR LAS CATEGORÍAS
//  · Agregar una categoría nueva (ej: "Platos sin picante")
//  · Renombrar: se escribe encima y se guarda
//  · Subir / bajar: cambia el orden en que salen en la carta
//  · Eliminar: solo si no tiene platos (si tiene, se avisa por qué no)
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import {
  obtenerCategoriasAdmin, crearCategoria, renombrarCategoria, moverCategoria, eliminarCategoria,
} from '../services/api.js';
import { IconoCerrar } from './Iconos.jsx';

export default function GestionCategorias({ onCerrar, onCambio }) {
  const [lista, setLista] = useState([]);
  const [nombres, setNombres] = useState({});         // nombres que se están editando
  const [nueva, setNueva] = useState('');
  const [porEliminar, setPorEliminar] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLista(await obtenerCategoriasAdmin());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Hace una acción, recarga la lista y avisa al admin para que actualice la carta
  async function hacer(accion) {
    setOcupado(true);
    setError('');
    try {
      await accion();
      await cargar();
      onCambio();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregar(e) {
    e.preventDefault();
    if (await hacer(() => crearCategoria(nueva))) setNueva('');
  }

  async function renombrar(c) {
    if (await hacer(() => renombrarCategoria(c.id, nombres[c.id]))) {
      setNombres((n) => { const copia = { ...n }; delete copia[c.id]; return copia; });
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal gestion-categorias" role="dialog" aria-modal="true" aria-label="Categorías"
        onClick={(e) => e.stopPropagation()}>
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar"><IconoCerrar /></button>
        <h2 className="modal-titulo">Categorías</h2>
        <p className="modal-ayuda">Así se agrupan los platos en la carta, en este orden.</p>

        <ul className="categorias-lista">
          {lista.map((c, i) => {
            const editado = nombres[c.id] !== undefined && nombres[c.id] !== c.nombre;
            return (
              <li key={c.id}>
                <div className="categorias-fila">
                  <div className="categorias-mover">
                    <button onClick={() => hacer(() => moverCategoria(c.id, 'arriba'))} disabled={i === 0 || ocupado}
                      aria-label={`Subir ${c.nombre}`}>↑</button>
                    <button onClick={() => hacer(() => moverCategoria(c.id, 'abajo'))} disabled={i === lista.length - 1 || ocupado}
                      aria-label={`Bajar ${c.nombre}`}>↓</button>
                  </div>
                  <input value={nombres[c.id] ?? c.nombre} aria-label={`Nombre de ${c.nombre}`} maxLength={50}
                    onChange={(e) => setNombres({ ...nombres, [c.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && editado && renombrar(c)} />
                  {editado
                    ? <button className="boton-chico activo" onClick={() => renombrar(c)} disabled={ocupado}>Guardar</button>
                    : <span className="categorias-cuenta">{c.platos} {c.platos === 1 ? 'plato' : 'platos'}</span>}
                </div>

                <div className="categorias-acciones">
                  {porEliminar === c.id ? (
                    <>
                      <button className="boton-chico peligro" disabled={ocupado}
                        onClick={async () => { await hacer(() => eliminarCategoria(c.id)); setPorEliminar(null); }}>
                        Sí, eliminar
                      </button>
                      <button className="boton-chico" onClick={() => setPorEliminar(null)}>No</button>
                    </>
                  ) : (
                    <button className="enlace-eliminar" onClick={() => setPorEliminar(c.id)}>Eliminar</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {error && <p className="error">{error}</p>}

        <form className="categorias-nueva" onSubmit={agregar}>
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={50}
            placeholder="Nueva categoría (ej: Platos sin picante)" aria-label="Nueva categoría" />
          <button className="boton-chico activo" disabled={nueva.trim().length < 3 || ocupado}>Agregar</button>
        </form>
      </div>
    </div>
  );
}
