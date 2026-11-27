// =====================================================================
//  fotos.js — ACHICAR UNA FOTO ANTES DE SUBIRLA
//  Una foto de celular pesa 3-5 MB. La dibujamos en un <canvas> más
//  pequeño (800 px de lado máximo) y la guardamos como JPG: queda en
//  ~80-150 KB, se sube rápido y no llena la base de datos.
// =====================================================================
const LADO_MAXIMO = 800;
const CALIDAD = 0.82;     // 0 a 1: calidad del JPG

// Recibe el archivo elegido en <input type="file"> y devuelve
// una "data URL" (la imagen escrita como texto: "data:image/jpeg;base64,...")
export function achicarFoto(archivo) {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      return rechazar(new Error('Ese archivo no es una imagen'));
    }
    const url = URL.createObjectURL(archivo);   // dirección temporal del archivo
    const img = new Image();

    img.onload = () => {
      // Calculamos el nuevo tamaño sin deformarla
      const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolver(canvas.toDataURL('image/jpeg', CALIDAD));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se pudo leer la imagen (prueba con una foto JPG o PNG)'));
    };
    img.src = url;
  });
}
