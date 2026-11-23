// =====================================================================
//  Saludo.jsx — Saludo según la hora del día
//  Un detalle pequeño que hace sentir al cliente como en casa.
// =====================================================================
function saludoSegunHora() {
  const hora = new Date().getHours();
  if (hora < 12) return '¡Buenos días!';
  if (hora < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

export default function Saludo() {
  return (
    <div className="saludo">
      <p className="saludo-hola">{saludoSegunHora()}</p>
      <h1 className="saludo-titulo">¿Qué se te antoja hoy?</h1>
      <p className="saludo-lema">Cocinamos como en casa, con leña y mucho cariño.</p>
    </div>
  );
}
