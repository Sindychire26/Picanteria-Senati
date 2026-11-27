// =====================================================================
//  ModalQR.jsx — Ventana con el QR grande de una mesa
//  Se usa en el Inicio y en la pestaña Mesas del admin.
// =====================================================================
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import CodigoQR, { urlDeMesa } from './CodigoQR.jsx';
import { IconoCerrar } from './Iconos.jsx';

export default function ModalQR({ mesa, onCerrar }) {
  // Cerrar con la tecla Escape
  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    // Clic en el fondo oscuro = cerrar. stopPropagation evita que un clic DENTRO lo cierre.
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-qr" role="dialog" aria-modal="true" aria-label={`QR de la mesa ${mesa.numero}`}
        onClick={(e) => e.stopPropagation()}>
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar"><IconoCerrar /></button>
        <h2 className="modal-titulo">Mesa {mesa.numero}</h2>
        <p className="modal-ayuda">Escanea con la cámara del celular</p>
        <CodigoQR codigo={mesa.codigo} tamano={240} />
        <p className="modal-url">{urlDeMesa(mesa.codigo)}</p>
        <Link to={`/mesa/${mesa.codigo}`} className="boton boton-grande">Abrir la carta</Link>
      </div>
    </div>
  );
}
