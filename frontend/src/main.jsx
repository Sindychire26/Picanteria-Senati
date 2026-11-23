// =====================================================================
//  main.jsx — PUNTO DE ENTRADA DE REACT
//  Monta la app dentro del <div id="root"> de index.html.
// =====================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CarritoProvider } from './context/CarritoContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter permite tener varias "páginas" con URLs distintas */}
    <BrowserRouter>
      {/* CarritoProvider: el carrito queda disponible en TODAS las páginas */}
      <CarritoProvider>
        <App />
      </CarritoProvider>
    </BrowserRouter>
  </StrictMode>
);
