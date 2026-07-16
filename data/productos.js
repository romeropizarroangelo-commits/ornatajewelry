/* ============================================================
   ORNATA JEWELRY — Base de datos de productos
   ------------------------------------------------------------
   Puedes editar este archivo a mano O usar el Panel (admin.html).
   Campos:
     id         : identificador único (no repetir)
     nombre     : nombre del producto
     categoria  : "Aretes" | "Pulseras" | "Anillos" | "Collares"
     precio     : número (ej: 89.90) o null si es "a consultar"
     descripcion: texto corto
     img        : nombre del archivo dentro de assets/productos/
                  (ej: "01.jpg"). Si no existe, se muestra un
                  marcador elegante hasta que subas la foto.
     tag        : etiqueta opcional ("Nuevo", "Best seller"...) o ""
   ============================================================ */
window.ORNATA_PRODUCTOS = [
  { id:"p01", nombre:"Aretes Trinity Pavé",      categoria:"Aretes",   precio:null, descripcion:"Diseño triangular en tono dorado cubierto de cristales.", img:"01.jpg", tag:"Best seller" },
  { id:"p02", nombre:"Aretes Cascada Martelé",   categoria:"Aretes",   precio:null, descripcion:"Tres discos dorados con textura martelada en caída.",       img:"02.jpg", tag:"Nuevo" },
  { id:"p03", nombre:"Aretes Quadra Brillante",  categoria:"Aretes",   precio:null, descripcion:"Colgante cuadrado con pavé de cristales sobre aro dorado.", img:"03.jpg", tag:"" },
  { id:"p04", nombre:"Aretes Esmeralda Real",    categoria:"Aretes",   precio:null, descripcion:"Piedra verde talla cojín con halo de cristales.",           img:"04.jpg", tag:"" },
  { id:"p05", nombre:"Aretes Corona Perla",      categoria:"Aretes",   precio:null, descripcion:"Corona de perlas y cristales rematada con un lazo.",         img:"05.jpg", tag:"" },
  { id:"p06", nombre:"Aretes Nácar Espiral",     categoria:"Aretes",   precio:null, descripcion:"Espiral de cristales con perla central luminosa.",          img:"06.jpg", tag:"" },
  { id:"p07", nombre:"Aretes Corazón Ónix",      categoria:"Aretes",   precio:null, descripcion:"Corazón negro rodeado por un halo de cristales.",           img:"07.jpg", tag:"" },
  { id:"p08", nombre:"Aretes Quadra Noir",       categoria:"Aretes",   precio:null, descripcion:"Cuadrado negro con pavé dorado, elegante y sobrio.",        img:"08.jpg", tag:"" },
  { id:"p09", nombre:"Aretes Aro Textura Oro",   categoria:"Aretes",   precio:null, descripcion:"Aro tipo C con textura, plata 925 en tono dorado.",         img:"09.jpg", tag:"" },
  { id:"p10", nombre:"Aretes Zafiro Cuadrado",   categoria:"Aretes",   precio:null, descripcion:"Cristal azul talla cuadrada con halo brillante.",           img:"10.jpg", tag:"" },
  { id:"p11", nombre:"Aretes Perla Remolino",    categoria:"Aretes",   precio:null, descripcion:"Remolino dorado con perla nacarada al centro.",             img:"11.jpg", tag:"" },
  { id:"p12", nombre:"Aretes Flor Dorada",       categoria:"Aretes",   precio:null, descripcion:"Flor de pétalos en oro mate, statement moderno.",          img:"12.jpg", tag:"Nuevo" },
  { id:"p13", nombre:"Aretes Magnolia",          categoria:"Aretes",   precio:null, descripcion:"Flor color crema con contorno dorado y centro brillante.",  img:"13.jpg", tag:"" },
  { id:"p14", nombre:"Aretes Esmeralda Trinity", categoria:"Aretes",   precio:null, descripcion:"Piedra verde triangular con contorno de cristales.",        img:"14.jpg", tag:"" },
  { id:"p15", nombre:"Aretes Esfera Nido",       categoria:"Aretes",   precio:null, descripcion:"Esfera de hilo dorado con disco pulido, diseño artístico.",  img:"15.jpg", tag:"" },
  { id:"p16", nombre:"Aretes Aro Perla Racimo",  categoria:"Aretes",   precio:null, descripcion:"Aro abierto cubierto de perlas en racimo.",                 img:"16.jpg", tag:"" },
  { id:"p17", nombre:"Aretes Trinity Rosé",      categoria:"Aretes",   precio:null, descripcion:"Triángulo en tonos nácar y rosado, delicado.",              img:"17.jpg", tag:"" },
  { id:"p18", nombre:"Pulsera Corazón Aura",     categoria:"Pulseras", precio:null, descripcion:"Brazalete ajustable con corazón de cristales.",             img:"18.jpg", tag:"Best seller" },
  { id:"p19", nombre:"Aretes Corazón Zafiro",    categoria:"Aretes",   precio:null, descripcion:"Corazón azul con contorno dorado, romántico.",              img:"19.jpg", tag:"" },
  { id:"p20", nombre:"Aretes Perla Noir",        categoria:"Aretes",   precio:null, descripcion:"Remolino negro y dorado con perla central.",                img:"20.jpg", tag:"" },
  { id:"p21", nombre:"Aretes Aro Cristal",       categoria:"Aretes",   precio:null, descripcion:"Huggie dorado con cristales incrustados.",                  img:"21.jpg", tag:"" },
  { id:"p22", nombre:"Aretes Aro Cadena",        categoria:"Aretes",   precio:null, descripcion:"Aro con eslabones tipo cadena, estilo urbano chic.",        img:"22.jpg", tag:"" },
  { id:"p23", nombre:"Aretes Aro Onda",          categoria:"Aretes",   precio:null, descripcion:"Huggie dorado de silueta ondulada.",                        img:"23.jpg", tag:"" },
  { id:"p24", nombre:"Aretes Aro Eslabón",       categoria:"Aretes",   precio:null, descripcion:"Aro de eslabones redondeados, volumen elegante.",           img:"24.jpg", tag:"" },
  { id:"p25", nombre:"Aretes Aro Relieve",       categoria:"Aretes",   precio:null, descripcion:"Huggie rectangular con relieve texturizado.",               img:"25.jpg", tag:"" }
];

/* Datos del negocio (edítalos en admin.html o aquí) */
window.ORNATA_CONFIG = {
  whatsapp: "51962735650",
  instagram: "https://www.instagram.com/ornatajewelrype",
  moneda: "S/",
  // Pagos
  yape:  "962 735 650",     // número Yape/Plin
  titular: "ORNATA Jewelry",
  banco: "",                 // ej: "BCP 191-XXXXXXXX-0-XX"
  cci: "",                   // opcional
  envio: "Envíos a todo el país"
};
