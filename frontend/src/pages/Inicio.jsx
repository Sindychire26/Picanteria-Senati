// =====================================================================
//  Inicio.jsx — PANTALLA DE BIENVENIDA (modo demo)
//  Como en la presentación no habrá QR pegados en mesas, aquí listamos
//  las mesas para "simular" que escaneaste el QR de una.
// =====================================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerMesas } from '../services/api.js';
import { RESTAURANTE } from '../config.js';
import Logo from '../components/Logo.jsx';

export default function Inicio() {
  // useState: variables que, al cambiar, hacen que React vuelva a dibujar
  const [mesas, setMesas] = useState([]);
  const [error, setError] = useState('');

  // useEffect con [] = se ejecuta UNA vez, cuando aparece la pantalla
  useEffect(() => {
    obtenerMesas()
      .then(setMesas)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="inicio">
      <Logo className="inicio-logo" />
      <h1>{RESTAURANTE.nombre}</h1>
      <p className="inicio-lema">{RESTAURANTE.lema}</p>

      <div className="inicio-caja">
        <p>Escanea el código QR de tu mesa para ver la carta y pedir.</p>
      </div>

      <h2 className="inicio-demo">Modo demo: elige una mesa</h2>
      {error && <p className="error">{error}</p>}

      <div className="inicio-mesas">
        {mesas.map((mesa) => (
          <Link key={mesa.id} to={`/mesa/${mesa.codigo}`} className="inicio-mesa">
            Mesa {mesa.numero}
          </Link>
        ))}
      </div>

      <Link to="/personal/login" className="inicio-personal">Acceso del personal</Link>
    </main>
  );
}
