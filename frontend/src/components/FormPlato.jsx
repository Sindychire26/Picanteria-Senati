// =====================================================================
//  FormPlato.jsx — FORMULARIO PARA AGREGAR O EDITAR UN PLATO (admin)
//  · plato = null  → plato NUEVO
//  · plato = {...} → EDITAR ese plato (los campos vienen llenos)
//  La foto se elige de la galería (o la cámara en el celular), se
//  achica en el navegador y se sube primero; luego se guarda el plato
//  con la dirección de esa foto.
// =====================================================================
import { useState } from 'react';
import { crearPlato, actualizarPlato, subirFoto } from '../services/api.js';
import { achicarFoto } from '../services/fotos.js';
import FotoPlato from './FotoPlato.jsx';
import { NIVELES_PICANTE } from './Picante.jsx';

// Nombres de tamaño que más se usan: un toque y se llenan los dos
const SUGERENCIAS = [['Vaso', 'Jarra'], ['Personal', '1 litro'], ['Media', 'Entera']];
import { IconoCerrar } from './Iconos.jsx';

export default function FormPlato({ plato, categorias, onCerrar, onGuardado }) {
  const editando = Boolean(plato);

  // Un solo objeto con todos los campos del formulario
  const [datos, setDatos] = useState({
    nombre: plato?.nombre ?? '',
    descripcion: plato?.descripcion ?? '',
    categoria_id: plato?.categoria_id ?? '',
    precio: plato ? plato.precio.toFixed(2) : '',
    picante: plato?.picante ?? 0,
    // Dos tamaños (opcional): si "dosTamanos" está activo, "precio" es el del tamaño chico
    dosTamanos: Boolean(plato?.precio_grande),
    nombre_chico: plato?.nombre_chico ?? '',
    nombre_grande: plato?.nombre_grande ?? '',
    precio_grande: plato?.precio_grande ? plato.precio_grande.toFixed(2) : '',
  });
  const [fotoNueva, setFotoNueva] = useState(null);   // data URL de la foto elegida (aún no subida)
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Cambia un campo y deja los demás igual
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  async function elegirFoto(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      setFotoNueva(await achicarFoto(archivo));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function guardar(e) {
    e.preventDefault();                       // que el formulario no recargue la página
    if (datos.nombre.trim().length < 3) return setError('El nombre debe tener al menos 3 letras');
    if (!datos.categoria_id) return setError('Elige una categoría');
    if (!(Number(datos.precio) > 0)) return setError('Escribe un precio válido');
    if (datos.dosTamanos) {
      if (!datos.nombre_chico.trim() || !datos.nombre_grande.trim()) return setError('Ponle nombre a los dos tamaños (ej: Vaso y Jarra)');
      if (!(Number(datos.precio_grande) > 0)) return setError(`Escribe el precio de ${datos.nombre_grande || 'el tamaño grande'}`);
    }

    setGuardando(true);
    setError('');
    try {
      // 1. Si eligió foto nueva, primero la subimos y nos devuelve su dirección
      let imagen_url;
      if (fotoNueva) imagen_url = (await subirFoto(fotoNueva)).url;

      // 2. Guardamos el plato
      const cuerpo = {
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        categoria_id: Number(datos.categoria_id),
        precio: Number(datos.precio),
        picante: Number(datos.picante),
        // Tamaños: si no tiene dos tamaños, mandamos null para que quede con un solo precio
        precio_grande: datos.dosTamanos ? Number(datos.precio_grande) : null,
        nombre_chico: datos.dosTamanos ? datos.nombre_chico.trim() : null,
        nombre_grande: datos.dosTamanos ? datos.nombre_grande.trim() : null,
        ...(imagen_url && { imagen_url }),
      };
      if (editando) await actualizarPlato(plato.id, cuerpo);
      else await crearPlato(cuerpo);

      onGuardado(editando ? 'Cambios guardados' : `"${cuerpo.nombre}" ya está en la carta`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal form-plato" onSubmit={guardar} onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={editando ? 'Editar plato' : 'Nuevo plato'}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar"><IconoCerrar /></button>
        <h2 className="modal-titulo">{editando ? 'Editar plato' : 'Nuevo plato'}</h2>

        {/* Foto: la vista previa es también el botón para elegirla */}
        <label className="form-plato-foto">
          <FotoPlato src={fotoNueva || plato?.imagen_url} alt="" className="form-plato-vista" />
          <span className="boton-chico">{fotoNueva || plato?.imagen_url ? 'Cambiar foto' : 'Subir foto de la galería'}</span>
          {/* accept="image/*": en el celular ofrece la galería o la cámara */}
          <input type="file" accept="image/*" onChange={elegirFoto} hidden />
        </label>

        <label className="campo">
          Nombre
          <input value={datos.nombre} onChange={cambiar('nombre')} maxLength={100} placeholder="Ej: Ocopa arequipeña" />
        </label>

        <label className="campo">
          Descripción
          <textarea value={datos.descripcion} onChange={cambiar('descripcion')} rows={3} maxLength={300}
            placeholder="Qué lleva, cómo se sirve..." />
        </label>

        <div className="campo-doble">
          <label className="campo">
            Categoría
            <select value={datos.categoria_id} onChange={cambiar('categoria_id')}>
              <option value="">Elegir...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="campo">
            {datos.dosTamanos ? `Precio ${datos.nombre_chico || 'chico'} (S/)` : 'Precio (S/)'}
            <input inputMode="decimal" value={datos.precio} placeholder="0.00"
              onChange={(e) => setDatos({ ...datos, precio: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
        </div>

        {/* ¿Pica? Se muestra en la carta y el asistente lo usa para recomendar */}
        <div className="campo">
          ¿Pica?
          <div className="opciones-picante" role="radiogroup" aria-label="Nivel de picante">
            {NIVELES_PICANTE.map((texto, nivel) => (
              <button type="button" key={texto} role="radio" aria-checked={Number(datos.picante) === nivel}
                className={Number(datos.picante) === nivel ? 'activo' : ''}
                onClick={() => setDatos({ ...datos, picante: nivel })}>
                {texto}
              </button>
            ))}
          </div>
        </div>

        {/* Dos tamaños (bebidas, por ejemplo): cada uno con su nombre y su precio */}
        <label className="form-plato-check">
          <input type="checkbox" checked={datos.dosTamanos}
            onChange={(e) => setDatos({ ...datos, dosTamanos: e.target.checked })} />
          Se vende en dos tamaños (ej: vaso y jarra, personal y 1 litro)
        </label>

        {datos.dosTamanos && (
          <div className="form-plato-tamanos">
            <div className="sugerencias">
              {SUGERENCIAS.map(([chico, grande]) => (
                <button type="button" key={chico} className="boton-chico"
                  onClick={() => setDatos({ ...datos, nombre_chico: chico, nombre_grande: grande })}>
                  {chico} / {grande}
                </button>
              ))}
            </div>
            <div className="campo-doble">
              <label className="campo">
                Tamaño chico
                <input value={datos.nombre_chico} maxLength={20} placeholder="Vaso" onChange={cambiar('nombre_chico')} />
              </label>
              <label className="campo">
                Tamaño grande
                <input value={datos.nombre_grande} maxLength={20} placeholder="Jarra" onChange={cambiar('nombre_grande')} />
              </label>
            </div>
            <label className="campo">
              Precio {datos.nombre_grande || 'grande'} (S/)
              <input inputMode="decimal" value={datos.precio_grande} placeholder="0.00"
                onChange={(e) => setDatos({ ...datos, precio_grande: e.target.value.replace(/[^\d.]/g, '') })} />
            </label>
            <p className="form-plato-ayuda">
              En la carta saldrán dos botones: {datos.nombre_chico || 'chico'} S/ {Number(datos.precio || 0).toFixed(2)} y {datos.nombre_grande || 'grande'} S/ {Number(datos.precio_grande || 0).toFixed(2)}.
            </p>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button className="boton boton-grande" disabled={guardando}>
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar a la carta'}
        </button>
      </form>
    </div>
  );
}
