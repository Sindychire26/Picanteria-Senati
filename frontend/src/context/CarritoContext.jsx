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

// Cada línea del carrito tiene una "clave": el plato + su tamaño.
// Así "Chicha morada (Vaso)" y "Chicha morada (Jarra)" son dos líneas distintas.
const claveDe = (item) => item.clave ?? String(item.platoId);   // carritos viejos no tenían clave

export function CarritoProvider({ children }) {
  // Cada item: { clave, platoId, presentacion, nombre, precio, imagen_url, cantidad, nota }
  const [items, setItems] = useState(leerGuardado);

  // Cada vez que cambia el carrito, lo guardamos
  useEffect(() => {
    try { localStorage.setItem('carrito', JSON.stringify(items)); } catch { /* sin espacio: no pasa nada */ }
  }, [items]);

  // tamano: 'chico' o 'grande' (solo platos con dos tamaños, los que tienen precio_grande)
  function agregar(plato, tamano) {
    const tam = plato.precio_grande ? (tamano === 'grande' ? 'grande' : 'chico') : null;
    const nombreTam = tam === 'grande' ? (plato.nombre_grande || 'Grande') : (plato.nombre_chico || 'Chico');
    const clave = tam ? `${plato.id}-${tam}` : String(plato.id);
    setItems((actuales) => {
      const existe = actuales.find((i) => claveDe(i) === clave);
      if (existe) {
        // Ya estaba: solo sumamos 1 (máximo 20)
        return actuales.map((i) =>
          claveDe(i) === clave ? { ...i, cantidad: Math.min(i.cantidad + 1, 20) } : i
        );
      }
      // Nuevo en el carrito
      return [...actuales, {
        clave, platoId: plato.id, presentacion: tam,
        nombre: tam ? `${plato.nombre} (${nombreTam})` : plato.nombre,
        precio: tam === 'grande' ? plato.precio_grande : plato.precio,
        imagen_url: plato.imagen_url, cantidad: 1, nota: '',
      }];
    });
  }

  // Las demás funciones reciben la CLAVE de la línea (item.clave)
  function cambiarCantidad(clave, cantidad) {
    if (cantidad <= 0) return quitar(clave);
    setItems((a) => a.map((i) => (claveDe(i) === clave ? { ...i, cantidad: Math.min(cantidad, 20) } : i)));
  }

  function cambiarNota(clave, nota) {
    setItems((a) => a.map((i) => (claveDe(i) === clave ? { ...i, nota } : i)));
  }

  function quitar(clave) {
    setItems((a) => a.filter((i) => claveDe(i) !== clave));
  }

  function vaciar() {
    setItems([]);
  }

  // Valores calculados (no necesitan su propio estado)
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <CarritoContext.Provider
      value={{ items, agregar, cambiarCantidad, cambiarNota, quitar, vaciar, totalItems, total, claveDe }}
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
