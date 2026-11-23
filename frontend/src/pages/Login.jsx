// =====================================================================
//  Login.jsx — INICIO DE SESIÓN DEL PERSONAL
//  Cocina, mesero, caja y admin entran aquí con usuario y contraseña.
// =====================================================================
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { iniciarSesion } from '../services/api.js';
import { guardarSesion, obtenerSesion } from '../services/sesion.js';
import { RESTAURANTE } from '../config.js';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Si ya tiene sesión, directo a su panel
  if (obtenerSesion()) return <Navigate to="/personal" replace />;

  // onSubmit del formulario: funciona con clic en el botón o con Enter
  async function entrar(e) {
    e.preventDefault();               // evita que el navegador recargue la página
    if (!usuario.trim() || !password) return setError('Ingresa usuario y contraseña');

    setEntrando(true);
    setError('');
    try {
      const sesion = await iniciarSesion(usuario, password);   // { token, usuario }
      guardarSesion(sesion);
      navigate('/personal', { replace: true });
    } catch (e) {
      setError(e.message);
      setEntrando(false);
    }
  }

  return (
    <main className="login">
      <Logo className="inicio-logo" />
      <h1>{RESTAURANTE.nombre}</h1>
      <p className="inicio-lema">Acceso del personal</p>

      <form className="login-caja" onSubmit={entrar}>
        <label className="campo">
          Usuario
          <input value={usuario} onChange={(e) => { setUsuario(e.target.value); setError(''); }}
            autoComplete="username" autoCapitalize="none" placeholder="ej: cocina" />
        </label>
        <label className="campo">
          Contraseña
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoComplete="current-password" />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="boton boton-grande" disabled={entrando}>
          {entrando ? 'Entrando...' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
