// =====================================================================
//  CarritoContext.jsx — EL CARRITO (estado global)
//  Un "Context" es una caja de datos que TODAS las páginas pueden usar
//  sin pasarse props de una en una: la carta agrega, el carrito muestra,
//  el pago lo envía. Todos leen y escriben el mismo carrito.
//  Además se guarda en localStorage: si recargas la página, no se pierde.
// =====================================================================
import { createContext, useContext, useEffect, useState } from 'react';

const CarritoContext = createContext(null);

function leerGuardado() {
  try {
    return JSON.parse(localStorage.getItem('carrito')) || [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }) {
  // Cada item: { platoId, nombre, precio, imagen_url, cantidad, nota }
  const [items, setItems] = useState(leerGuardado);

  // Cada vez que cambia el carrito, lo guardamos
  useEffect(() => {
    try { localStorage.setItem('carrito', JSON.stringify(items)); } catch { /* sin espacio: no pasa nada */ }
  }, [items]);

  function agregar(plato) {
    setItems((actuales) => {
      const existe = actuales.find((i) => i.platoId === plato.id);
      if (existe) {
        // Ya estaba: solo sumamos 1 (máximo 20)
        return actuales.map((i) =>
          i.platoId === plato.id ? { ...i, cantidad: Math.min(i.cantidad + 1, 20) } : i
        );
      }
      // Nuevo en el carrito
      return [...actuales, {
        platoId: plato.id, nombre: plato.nombre, precio: plato.precio,
        imagen_url: plato.imagen_url, cantidad: 1, nota: '',
      }];
    });
  }

  function cambiarCantidad(platoId, cantidad) {
    if (cantidad <= 0) return quitar(platoId);
    setItems((a) => a.map((i) => (i.platoId === platoId ? { ...i, cantidad: Math.min(cantidad, 20) } : i)));
  }

  function cambiarNota(platoId, nota) {
    setItems((a) => a.map((i) => (i.platoId === platoId ? { ...i, nota } : i)));
  }

  function quitar(platoId) {
    setItems((a) => a.filter((i) => i.platoId !== platoId));
  }

  function vaciar() {
    setItems([]);
  }

  // Valores calculados (no necesitan su propio estado)
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <CarritoContext.Provider
      value={{ items, agregar, cambiarCantidad, cambiarNota, quitar, vaciar, totalItems, total }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

// Hook para usar el carrito desde cualquier componente:
//   const { items, agregar } = useCarrito();
export function useCarrito() {
  return useContext(CarritoContext);
}
