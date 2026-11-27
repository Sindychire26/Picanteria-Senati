// =====================================================================
//  CategoriasNav.jsx — Botones de categorías (fijos arriba al hacer scroll)
//  Al tocar uno, la pantalla baja suavemente a esa sección.
//  El primero, "Sin picante", es un filtro que se prende y se apaga.
// =====================================================================
export default function CategoriasNav({ categorias, sinPicante, onSinPicante }) {
  function irA(id) {
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="categorias">
      <button className={`categoria-chip filtro-picante ${sinPicante ? 'activo' : ''}`} onClick={onSinPicante}
        aria-pressed={sinPicante}>
        Sin picante
      </button>
      {categorias.map((c) => (
        <button key={c.id} className="categoria-chip" onClick={() => irA(c.id)}>
          {c.nombre}
        </button>
      ))}
    </nav>
  );
}
