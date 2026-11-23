// =====================================================================
//  Cuenta.jsx — "MI CUENTA" DEL CLIENTE
//  Sin sesión: formulario para INGRESAR o CREAR CUENTA (con beneficios)
//  Con sesión: cupones, tarjetas guardadas e historial de pedidos
// =====================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { registrarCliente, ingresarCliente, obtenerMiCuenta, borrarTarjeta } from '../services/api.js';
import { guardarCliente, obtenerCliente, cerrarCliente } from '../services/cliente.js';
import CabeceraPagina from '../components/CabeceraPagina.jsx';

const ESTADOS = {
  pendiente_pago: 'Por pagar', pagado: 'Recibido', en_preparacion: 'Cocinando',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};

export default function Cuenta() {
  const { codigo } = useParams();
  const [sesion, setSesion] = useState(obtenerCliente());   // { token, cliente } o null
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState('');

  // Formulario
  const [modo, setModo] = useState('registro');              // 'registro' | 'ingreso'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [enviando, setEnviando] = useState(false);

  const cargarPerfil = useCallback(async () => {
    try {
      setPerfil(await obtenerMiCuenta());
    } catch (e) {
      // Si el token venció, api.js ya cerró la sesión: volvemos al formulario
      if (!obtenerCliente()) setSesion(null);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (sesion) cargarPerfil();
  }, [sesion, cargarPerfil]);

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const datos = modo === 'registro'
        ? await registrarCliente(form)
        : await ingresarCliente({ email: form.email, password: form.password });
      guardarCliente(datos);
      setSesion(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function quitarTarjeta(id) {
    try {
      await borrarTarjeta(id);
      cargarPerfil();
    } catch (e) {
      setError(e.message);
    }
  }

  function salir() {
    cerrarCliente();
    setSesion(null);
    setPerfil(null);
  }

  // ------------------------- SIN SESIÓN -------------------------
  if (!sesion) {
    return (
      <>
        <CabeceraPagina titulo="Mi cuenta" volverA={`/mesa/${codigo}`} />
        <main className="pagina">
          <div className="beneficios">
            <p className="beneficios-titulo">Crea tu cuenta y disfruta más</p>
            <ul>
              <li>10% de descuento en tu siguiente pedido si consumes más de S/100</li>
              <li>Guarda tu tarjeta y paga con un solo toque</li>
              <li>Revisa todos tus pedidos anteriores</li>
            </ul>
            <p className="beneficios-nota">¿Solo estás de paso? No necesitas cuenta: puedes pedir como invitado.</p>
          </div>

          <div className="pestanas">
            <button className={modo === 'registro' ? 'activa' : ''} onClick={() => { setModo('registro'); setError(''); }}>
              Crear cuenta
            </button>
            <button className={modo === 'ingreso' ? 'activa' : ''} onClick={() => { setModo('ingreso'); setError(''); }}>
              Ya tengo cuenta
            </button>
          </div>

          <form className="formulario" onSubmit={enviar}>
            {modo === 'registro' && (
              <label className="campo">
                Nombre
                <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} autoComplete="name" />
              </label>
            )}
            <label className="campo">
              Correo
              <input type="email" value={form.email} onChange={(e) => cambiar('email', e.target.value)} autoComplete="email" />
            </label>
            <label className="campo">
              Contraseña {modo === 'registro' && <span className="campo-ayuda">(mínimo 6 caracteres)</span>}
              <input type="password" value={form.password} onChange={(e) => cambiar('password', e.target.value)}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} />
            </label>

            {error && <p className="error">{error}</p>}

            <button className="boton boton-grande" disabled={enviando}>
              {enviando ? 'Un momento...' : modo === 'registro' ? 'Crear mi cuenta' : 'Ingresar'}
            </button>
          </form>
        </main>
      </>
    );
  }

  // ------------------------- CON SESIÓN -------------------------
  return (
    <>
      <CabeceraPagina titulo="Mi cuenta" volverA={`/mesa/${codigo}`} />
      <main className="pagina">
        <h2 className="cuenta-hola">¡Hola, {sesion.cliente.nombre}!</h2>
        {perfil && <p className="cuenta-email">{perfil.email}</p>}
        {error && <p className="error">{error}</p>}

        {/* Cupones */}
        <h3 className="pagina-subtitulo">Mis cupones</h3>
        {perfil?.cupones.length ? (
          perfil.cupones.map((c) => (
            <div key={c.id} className="cupon">
              <span className="cupon-porcentaje">{c.porcentaje}%</span>
              <div>
                <p className="cupon-titulo">{c.titulo}</p>
                <p className="cupon-ayuda">Se aplica en tu próximo pago</p>
              </div>
            </div>
          ))
        ) : (
          <p className="cuenta-vacio">Aún no tienes cupones. Consume más de S/100 y gana 10% para tu siguiente pedido.</p>
        )}

        {/* Tarjetas */}
        <h3 className="pagina-subtitulo">Mis tarjetas</h3>
        {perfil?.metodos.length ? (
          perfil.metodos.map((m) => (
            <div key={m.id} className="tarjeta-guardada">
              <span className="tarjeta-guardada-marca">{m.marca}</span>
              <span className="tarjeta-guardada-numero">•••• {m.ultimos4}</span>
              <button className="boton-chico" onClick={() => quitarTarjeta(m.id)}>Quitar</button>
            </div>
          ))
        ) : (
          <p className="cuenta-vacio">Puedes guardar tu tarjeta al momento de pagar.</p>
        )}

        {/* Historial */}
        <h3 className="pagina-subtitulo">Mis pedidos</h3>
        {perfil?.pedidos.length ? (
          <ul className="historial">
            {perfil.pedidos.map((p) => (
              <li key={p.id}>
                <div>
                  <p className="historial-codigo">Pedido {p.codigo} · Mesa {p.mesa}</p>
                  <p className="historial-fecha">
                    {new Date(p.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    {' · '}{ESTADOS[p.estado]}
                  </p>
                </div>
                <span className="precio">S/ {p.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cuenta-vacio">Todavía no has hecho pedidos con tu cuenta.</p>
        )}

        <Link to={`/mesa/${codigo}`} className="boton boton-grande">Ir a la carta</Link>
        <button className="boton boton-grande boton-secundario" onClick={salir}>Cerrar sesión</button>
      </main>
    </>
  );
}
