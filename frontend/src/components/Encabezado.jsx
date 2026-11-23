// =====================================================================
//  Encabezado.jsx — Banner superior con la foto del Misti
//  Muestra el logo, el nombre, la mesa y los botones de buscar y Mi cuenta.
//  La foto va de FONDO (background-image) y encima una capa oscura
//  para que el texto blanco se lea bien.
//  Si la foto no existe, se ve el color terracota (no se rompe).
// =====================================================================
import { Link } from 'react-router-dom';
import { RESTAURANTE } from '../config.js';
import Logo from './Logo.jsx';
import { IconoBuscar, IconoUsuario } from './Iconos.jsx';

export default function Encabezado({ mesa, onBuscar }) {
  return (
    <header
      className="encabezado"
      style={{ backgroundImage: `url(${RESTAURANTE.banner})` }}
    >
      <div className="encabezado-fila">
        <div className="encabezado-marca">
          <Logo className="encabezado-logo" />
          <p className="encabezado-nombre">{RESTAURANTE.nombre}</p>
        </div>
        <div className="encabezado-acciones">
          {onBuscar && (
            <button className="encabezado-buscar" onClick={onBuscar} aria-label="Buscar platos">
              <IconoBuscar />
            </button>
          )}
          {/* Mi cuenta: registrarse, cupones, tarjetas guardadas */}
          {mesa && (
            <Link to={`/mesa/${mesa.codigo}/cuenta`} className="encabezado-buscar" aria-label="Mi cuenta">
              <IconoUsuario />
            </Link>
          )}
        </div>
      </div>

      <div className="encabezado-pie">
        <p className="encabezado-lema">{RESTAURANTE.lema}</p>
        {mesa && <span className="encabezado-mesa">Mesa {mesa.numero}</span>}
      </div>
    </header>
  );
}
