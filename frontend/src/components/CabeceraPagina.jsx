// =====================================================================
//  CabeceraPagina.jsx — Cabecera simple con flecha para volver
//  La usan Carrito, Pago y Mis pedidos.
// =====================================================================
import { Link } from 'react-router-dom';
import { IconoAtras } from './Iconos.jsx';

export default function CabeceraPagina({ titulo, volverA }) {
  return (
    <header className="cabecera-pagina">
      <Link to={volverA} className="cabecera-volver" aria-label="Volver">
        <IconoAtras />
      </Link>
      <h1 className="cabecera-titulo">{titulo}</h1>
    </header>
  );
}
