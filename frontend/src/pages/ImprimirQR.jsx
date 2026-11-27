// =====================================================================
//  ImprimirQR.jsx — HOJA CON LOS QR DE TODAS LAS MESAS (solo admin)
//  Cada tarjeta: logo, nombre del restaurante, número de mesa y su QR.
//  El botón "Imprimir" abre la ventana de impresión del navegador
//  (también se puede "Guardar como PDF"). Al imprimir se ocultan los botones.
// =====================================================================
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { obtenerMesas } from '../services/api.js';
import { obtenerSesion } from '../services/sesion.js';
import { RESTAURANTE } from '../config.js';
import CodigoQR from '../components/CodigoQR.jsx';
import Logo from '../components/Logo.jsx';

export default function ImprimirQR() {
  const esAdmin = obtenerSesion()?.usuario.rol === 'admin';
  const [mesas, setMesas] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (esAdmin) obtenerMesas().then(setMesas).catch((e) => setError(e.message));
  }, [esAdmin]);

  if (!esAdmin) return <Navigate to="/personal/login" replace />;

  return (
    <main className="imprimir">
      <div className="imprimir-barra">
        <Link to="/personal/admin" className="boton boton-secundario">Volver</Link>
        <p>{mesas.length} códigos · recórtalos y pégalos en cada mesa</p>
        <button className="boton" onClick={() => window.print()}>Imprimir</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="imprimir-hoja">
        {mesas.map((m) => (
          <div key={m.id} className="qr-tarjeta">
            <div className="qr-tarjeta-marca">
              <Logo className="qr-tarjeta-logo" />
              <span>{RESTAURANTE.nombre}</span>
            </div>
            <p className="qr-tarjeta-mesa">Mesa {m.numero}</p>
            <CodigoQR codigo={m.codigo} tamano={170} />
            <p className="qr-tarjeta-ayuda">Escanea para ver la carta y pedir</p>
            <p className="qr-tarjeta-codigo">{m.codigo}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
