// =====================================================================
//  App.jsx — RUTAS DE LA APLICACIÓN
//  Decide qué página mostrar según la URL.
// =====================================================================
import { Routes, Route } from 'react-router-dom';
import Inicio from './pages/Inicio.jsx';
import Carta from './pages/Carta.jsx';
import Carrito from './pages/Carrito.jsx';
import Pago from './pages/Pago.jsx';
import MisPedidos from './pages/MisPedidos.jsx';
import Login from './pages/Login.jsx';
import Panel from './pages/Panel.jsx';
import Cuenta from './pages/Cuenta.jsx';
import Admin from './pages/Admin.jsx';
import ImprimirQR from './pages/ImprimirQR.jsx';

export default function App() {
  return (
    <Routes>
      {/* Página inicial: en la vida real el cliente no la ve, porque entra por el QR */}
      <Route path="/" element={<Inicio />} />

      {/* El QR de cada mesa apunta aquí. Ej: /mesa/M05-E9R1 */}
      <Route path="/mesa/:codigo" element={<Carta />} />
      <Route path="/mesa/:codigo/carrito" element={<Carrito />} />
      <Route path="/mesa/:codigo/pago" element={<Pago />} />
      <Route path="/mesa/:codigo/pedidos" element={<MisPedidos />} />
      <Route path="/mesa/:codigo/cuenta" element={<Cuenta />} />

      {/* Personal del restaurante */}
      <Route path="/personal/login" element={<Login />} />
      <Route path="/personal" element={<Panel />} />
      <Route path="/personal/admin" element={<Admin />} />
      <Route path="/personal/qr" element={<ImprimirQR />} />

      {/* Cualquier otra URL */}
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
