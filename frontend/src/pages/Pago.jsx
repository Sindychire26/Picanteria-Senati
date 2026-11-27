// =====================================================================
//  Pago.jsx — ELEGIR CÓMO PAGAR (SIMULADO) Y ENVIAR EL PEDIDO
//  - Yape / Plin: celular + código de aprobación (como en la vida real)
//  - Tarjeta: formulario de prueba, o una TARJETA GUARDADA (un toque)
//  - Efectivo: el pedido espera a que caja confirme el pago
//  - Cliente registrado: puede usar su CUPÓN y guardar su tarjeta
//  Al confirmar, el carrito se envía al backend con POST /api/pedidos
// =====================================================================
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext.jsx';
import { crearPedido, obtenerMiCuenta, guardarTarjeta } from '../services/api.js';
import { obtenerCuenta, guardarCuenta } from '../services/cuenta.js';
import { obtenerCliente } from '../services/cliente.js';
import CabeceraPagina from '../components/CabeceraPagina.jsx';

const METODOS = [
  { id: 'yape', nombre: 'Yape', detalle: 'Paga con tu celular' },
  { id: 'plin', nombre: 'Plin', detalle: 'Paga con tu celular' },
  { id: 'tarjeta', nombre: 'Tarjeta', detalle: 'Débito o crédito' },
  { id: 'efectivo', nombre: 'Efectivo', detalle: 'Pagas en caja' },
];

// Espera X milisegundos (para simular que "el banco" está procesando)
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// La marca se reconoce por el primer dígito de la tarjeta
function marcaDe(numero) {
  if (numero.startsWith('4')) return 'Visa';
  if (numero.startsWith('5')) return 'Mastercard';
  if (numero.startsWith('3')) return 'American Express';
  return 'Tarjeta';
}

export default function Pago() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { items, total, vaciar } = useCarrito();
  const cliente = obtenerCliente();                       // null si es invitado

  const [metodo, setMetodo] = useState('yape');
  const [datos, setDatos] = useState({ celular: '', aprobacion: '', tarjeta: '', vence: '', cvv: '' });
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  // Solo para clientes registrados
  const [tarjetas, setTarjetas] = useState([]);           // tarjetas guardadas
  const [tarjetaGuardada, setTarjetaGuardada] = useState(null);  // id elegida (null = nueva)
  const [guardarNueva, setGuardarNueva] = useState(true);
  const [cupon, setCupon] = useState(null);               // primer cupón disponible
  const [usarCupon, setUsarCupon] = useState(true);

  // Si es cliente registrado, traemos sus tarjetas y cupones
  useEffect(() => {
    if (!obtenerCliente()) return;
    obtenerMiCuenta()
      .then((perfil) => {
        setTarjetas(perfil.metodos);
        setTarjetaGuardada(perfil.metodos[0]?.id ?? null);
        setCupon(perfil.cupones[0] ?? null);
      })
      .catch(() => { /* si falla, paga como invitado */ });
  }, []);

  // Si entran a /pago con el carrito vacío, los regresamos a la carta
  if (items.length === 0 && !procesando) return <Navigate to={`/mesa/${codigo}`} replace />;

  // Descuento que se MUESTRA (el que vale de verdad lo calcula el backend)
  const descuento = cupon && usarCupon ? Math.round(total * cupon.porcentaje) / 100 : 0;
  const totalFinal = total - descuento;
  const usaTarjetaGuardada = metodo === 'tarjeta' && tarjetaGuardada !== null;

  // Actualiza un campo del formulario dejando solo números
  function cambiar(campo, valor, max) {
    setDatos({ ...datos, [campo]: valor.replace(/\D/g, '').slice(0, max) });
    setError('');
  }

  // Revisa que el formulario esté completo. Devuelve el mensaje de error o ''
  function validar() {
    if (metodo === 'yape' || metodo === 'plin') {
      if (!/^9\d{8}$/.test(datos.celular)) return 'Ingresa un celular válido (9 dígitos, empieza con 9)';
      if (datos.aprobacion.length !== 6) return 'El código de aprobación tiene 6 dígitos';
    }
    if (metodo === 'tarjeta' && !usaTarjetaGuardada) {
      if (datos.tarjeta.length !== 16) return 'El número de tarjeta tiene 16 dígitos';
      if (datos.vence.length !== 4) return 'Ingresa la fecha de vencimiento (MMAA)';
      if (datos.cvv.length !== 3) return 'El CVV tiene 3 dígitos';
    }
    return '';
  }

  async function pagar() {
    const problema = validar();
    if (problema) return setError(problema);

    setProcesando(true);
    setError('');
    try {
      if (metodo !== 'efectivo') await esperar(1500);   // simulamos al banco

      // Solo mandamos lo necesario: QUÉ platos y CUÁNTOS. El precio lo pone el backend.
      const pedido = await crearPedido({
        codigoMesa: codigo,
        cuentaId: obtenerCuenta(codigo),
        metodoPago: metodo,
        cuponId: cupon && usarCupon ? cupon.id : undefined,
        items: items.map((i) => ({ platoId: i.platoId, cantidad: i.cantidad, nota: i.nota, presentacion: i.presentacion })),
      });

      // Guardar la tarjeta nueva (solo marca y últimos 4 dígitos, NUNCA el número completo)
      if (cliente && metodo === 'tarjeta' && !usaTarjetaGuardada && guardarNueva) {
        await guardarTarjeta(marcaDe(datos.tarjeta), datos.tarjeta.slice(-4)).catch(() => {});
      }

      guardarCuenta(codigo, pedido.cuenta_id);   // para los próximos pedidos de esta mesa
      vaciar();
      const extra = pedido.cupon_ganado ? `&cupon=${pedido.cupon_ganado}` : '';
      navigate(`/mesa/${codigo}/pedidos?nuevo=${pedido.id}${extra}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setProcesando(false);
    }
  }

  return (
    <>
      <CabeceraPagina titulo="Pago" volverA={`/mesa/${codigo}/carrito`} />

      <main className="pagina">
        {/* Invitado: invitación a registrarse */}
        {!cliente && (
          <Link to={`/mesa/${codigo}/cuenta`} className="aviso-registro">
            <strong>¿Consumo mayor a S/100?</strong> Crea tu cuenta y gana 10% en tu próximo pedido.
          </Link>
        )}

        {/* Cliente con cupón disponible */}
        {cupon && (
          <label className="usar-cupon">
            <input type="checkbox" checked={usarCupon} onChange={(e) => setUsarCupon(e.target.checked)} />
            <span>Usar mi cupón de <strong>{cupon.porcentaje}%</strong> de descuento</span>
          </label>
        )}

        <div className="pago-total">
          <div>
            <span>Total a pagar</span>
            {descuento > 0 && <p className="pago-descuento">Ahorras S/ {descuento.toFixed(2)}</p>}
          </div>
          <div className="pago-montos">
            {descuento > 0 && <s>S/ {total.toFixed(2)}</s>}
            <strong>S/ {totalFinal.toFixed(2)}</strong>
          </div>
        </div>

        <h2 className="pagina-subtitulo">¿Cómo quieres pagar?</h2>
        <div className="metodos">
          {METODOS.map((m) => (
            <button
              key={m.id}
              className={`metodo ${metodo === m.id ? 'activo' : ''}`}
              onClick={() => { setMetodo(m.id); setError(''); }}
              disabled={procesando}
            >
              <span className="metodo-nombre">{m.nombre}</span>
              <span className="metodo-detalle">{m.detalle}</span>
            </button>
          ))}
        </div>

        {/* ---------- Formulario según el método ---------- */}
        <div className="pago-formulario">
          {(metodo === 'yape' || metodo === 'plin') && (
            <>
              <label className="campo">
                Celular
                <input inputMode="numeric" placeholder="987 654 321" value={datos.celular}
                  onChange={(e) => cambiar('celular', e.target.value, 9)} />
              </label>
              <label className="campo">
                Código de aprobación
                <input inputMode="numeric" placeholder="6 dígitos (lo ves en tu app)" value={datos.aprobacion}
                  onChange={(e) => cambiar('aprobacion', e.target.value, 6)} />
              </label>
            </>
          )}

          {metodo === 'tarjeta' && (
            <>
              {/* Tarjetas guardadas: pagar con un toque */}
              {tarjetas.length > 0 && (
                <div className="tarjetas-opciones">
                  {tarjetas.map((t) => (
                    <button key={t.id} type="button"
                      className={`tarjeta-opcion ${tarjetaGuardada === t.id ? 'activa' : ''}`}
                      onClick={() => setTarjetaGuardada(t.id)}>
                      <span className="tarjeta-guardada-marca">{t.marca}</span> •••• {t.ultimos4}
                    </button>
                  ))}
                  <button type="button" className={`tarjeta-opcion ${tarjetaGuardada === null ? 'activa' : ''}`}
                    onClick={() => setTarjetaGuardada(null)}>
                    Usar otra tarjeta
                  </button>
                </div>
              )}

              {!usaTarjetaGuardada && (
                <>
                  <label className="campo">
                    Número de tarjeta
                    <input inputMode="numeric" placeholder="16 dígitos" value={datos.tarjeta}
                      onChange={(e) => cambiar('tarjeta', e.target.value, 16)} />
                  </label>
                  <div className="campo-doble">
                    <label className="campo">
                      Vence (MMAA)
                      <input inputMode="numeric" placeholder="1228" value={datos.vence}
                        onChange={(e) => cambiar('vence', e.target.value, 4)} />
                    </label>
                    <label className="campo">
                      CVV
                      <input inputMode="numeric" placeholder="123" value={datos.cvv}
                        onChange={(e) => cambiar('cvv', e.target.value, 3)} />
                    </label>
                  </div>
                  <button className="enlace-prueba" type="button"
                    onClick={() => setDatos({ ...datos, tarjeta: '4242424242424242', vence: '1228', cvv: '123' })}>
                    Usar tarjeta de prueba
                  </button>
                  {cliente && (
                    <label className="usar-cupon">
                      <input type="checkbox" checked={guardarNueva} onChange={(e) => setGuardarNueva(e.target.checked)} />
                      <span>Guardar esta tarjeta para la próxima vez</span>
                    </label>
                  )}
                </>
              )}
            </>
          )}

          {metodo === 'efectivo' && (
            <p className="pago-aviso">
              Tu pedido se enviará a la cocina cuando pagues en caja.
              Te daremos un código para que lo digas al cajero.
            </p>
          )}

          <p className="pago-simulado">Pago simulado: no se realiza ningún cobro real.</p>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="boton boton-grande" onClick={pagar} disabled={procesando}>
          {procesando
            ? (metodo === 'efectivo' ? 'Enviando pedido...' : 'Procesando pago...')
            : (metodo === 'efectivo' ? 'Confirmar pedido' : `Pagar S/ ${totalFinal.toFixed(2)}`)}
        </button>
      </main>
    </>
  );
}
