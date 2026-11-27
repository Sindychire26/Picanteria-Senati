// =====================================================================
//  Inicio.jsx — PANTALLA PRINCIPAL
//  Arriba, la banda con el nombre del restaurante. Luego dos contadores
//  (libres / ocupadas) y todas las mesas: LIBRE (azul suave) u OCUPADA
//  (rojo suave), cada una con su botón "Ver QR".
//  Se actualiza sola en tiempo real cuando alguien escanea un QR o el
//  mesero libera una mesa.
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerMesas } from '../services/api.js';
import { socket } from '../services/socket.js';
import { RESTAURANTE } from '../config.js';
import Logo from '../components/Logo.jsx';
import ModalQR from '../components/ModalQR.jsx';

export default function Inicio() {
  const [mesas, setMesas] = useState([]);
  const [error, setError] = useState('');
  const [mesaQR, setMesaQR] = useState(null);   // mesa cuyo QR se está mostrando

  const cargar = useCallback(() => {
    obtenerMesas()
      .then((lista) => { setMesas(lista); setError(''); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    cargar();
    socket.on('mesas:actualizadas', cargar);          // 📢 alguien ocupó o liberó una mesa
    const id = setInterval(cargar, 60000);            // y cada minuto, por las que se liberan solas
    return () => {
      socket.off('mesas:actualizadas', cargar);
      clearInterval(id);
    };
  }, [cargar]);

  const libres = mesas.filter((m) => !m.ocupada).length;
  const cerrarQR = useCallback(() => setMesaQR(null), []);

  return (
    <div className="inicio">
      {/* Banda de arriba con el nombre del restaurante */}
      <header className="inicio-cabecera">
        <Logo className="inicio-logo" />
        <div>
          <h1>{RESTAURANTE.nombre}</h1>
          <p>Escanea el QR de tu mesa para ver la carta y pedir</p>
        </div>
      </header>

      <main className="inicio-contenido">
        {/* Contadores: cuántas libres y cuántas ocupadas */}
        <div className="inicio-contadores">
          <div className="inicio-contador libre">
            <span>Libres</span>
            <strong>{libres}</strong>
          </div>
          <div className="inicio-contador ocupada">
            <span>Ocupadas</span>
            <strong>{mesas.length - libres}</strong>
          </div>
        </div>

        <h2 className="inicio-subtitulo">Nuestras mesas</h2>
        {error && <p className="error">{error}</p>}

        <div className="inicio-mesas">
          {mesas.map((mesa) => (
            <div key={mesa.id} className={`inicio-mesa ${mesa.ocupada ? 'ocupada' : 'libre'}`}>
              <span className="inicio-mesa-numero">{mesa.numero}</span>
              <span className="inicio-mesa-estado">{mesa.ocupada ? 'Ocupada' : 'Libre'}</span>
              <button className="inicio-mesa-qr" onClick={() => setMesaQR(mesa)}>Ver QR</button>
            </div>
          ))}
        </div>

        <Link to="/personal/login" className="inicio-personal">Acceso del personal</Link>
      </main>

      {mesaQR && <ModalQR mesa={mesaQR} onCerrar={cerrarQR} />}
    </div>
  );
}
