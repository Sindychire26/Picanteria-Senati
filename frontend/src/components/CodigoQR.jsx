// =====================================================================
//  CodigoQR.jsx — Dibuja el código QR de una mesa
//  Usa la librería "qrcode": convierte un texto (la dirección de la
//  carta de esa mesa) en una imagen QR.
//  La dirección se arma con window.location.origin, así funciona igual
//  en tu PC (http://192.168.x.x:5173) que en Render (https://...).
// =====================================================================
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Dirección completa de la carta de una mesa
export const urlDeMesa = (codigo) => `${window.location.origin}/mesa/${codigo}`;

export default function CodigoQR({ codigo, tamano = 240, className = '' }) {
  const [imagen, setImagen] = useState('');

  useEffect(() => {
    QRCode.toDataURL(urlDeMesa(codigo), {
      width: tamano * 2,                                 // el doble para que se vea nítido
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#2b1a35', light: '#fdfafe' },      // morado noche sobre lila casi blanco
    }).then(setImagen);
  }, [codigo, tamano]);

  if (!imagen) return <div className={`qr qr-cargando ${className}`} style={{ width: tamano, height: tamano }} />;
  return <img src={imagen} alt={`Código QR de la mesa ${codigo}`} width={tamano} height={tamano} className={`qr ${className}`} />;
}
