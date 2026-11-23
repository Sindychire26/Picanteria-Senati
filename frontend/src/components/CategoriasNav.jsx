// =====================================================================
//  CategoriasNav.jsx — Botones de categorías (fijos arriba al hacer scroll)
//  Al tocar uno, la pantalla baja suavemente a esa sección.
// =====================================================================
export default function CategoriasNav({ categorias }) {
  function irA(id) {
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="categorias">
      {categorias.map((c) => (
        <button key={c.id} className="categoria-chip" onClick={() => irA(c.id)}>
          {c.nombre}
        </button>
      ))}
    </nav>
  );
}
