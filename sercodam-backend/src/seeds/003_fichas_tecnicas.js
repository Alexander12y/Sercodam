/**
 * Seed para poblar la tabla de fichas técnicas con datos de ejemplo
 * Basado en las especificaciones técnicas de Sercodam
 */

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('ficha_tecnica').del()
    .then(function () {
      // Inserts seed entries
      return knex('ficha_tecnica').insert([
        {
          nombre_red: 'Red de Protección Perimetral Nylon',
          tipo_red: 'nylon',
          codigo_producto: 'NPP-001',
          calibre: 'No. 60 x 4"',
          luz_malla: '10 cm x 10 cm',
          resistencia: '1,400 - 1,600 KG por m2',
          certificacion: 'UNE EN – 1263-12004',
          material: 'Nylon 100% multifilamento de alta tenacidad',
          color: 'Negro',
          tratamiento: 'Resinas (bondeo) por termo-fijación, a base de presión de vapor',
          propiedades: 'Confeccionada en SQ. (cuadrada) tejida sin nudo la luz de malla para mayor resistencia, Trenzada, (16 hilos). 100% reciclable, tratada con resinas (bondeo) por termo-fijación, a base de presión de vapor, con resistencia a la intemperie, rayos UV y a la abrasión, muy baja absorción al agua (95% impermeable), no digerible por algún insecto, 100% inerte, no produce bacterias, no acumula electricidad estática, mantiene su tenacidad en ambientes ácidos y alcalinos, estirada y planchada a lo largo y ancho en vapor y aire seco para evitar su deformación.',
          ficha_tecnica_completa: 'Características de la red / Ficha técnica:\n\nEn calibre No. 60 x 4" (10 cm x 10 cm)\nCertificación UNE EN – 1263-12004\n\nConfeccionada en SQ. (cuadrada) tejida sin nudo la luz de malla para mayor resistencia, Trenzada, (16 hilos), con una resistencia de 1,400 – 1,600 KG por m2.\n\n100% reciclable, en color negro, tratada con resinas (bondeo) por termo-fijación, a base de presión de vapor, con resistencia a la intemperie, rayos UV y a la abrasión, muy baja absorción al agua (95% impermeable), no digerible por algún insecto, 100% inerte, no produce bacterias, no acumula electricidad estática, mantiene su tenacidad en ambientes ácidos y alcalinos, estirada y planchada a lo largo y ancho en vapor y aire seco para evitar su deformación.\n\n*Reforzada en todas sus orillas con piola Cal.120.\n\nGarantía de fábrica 5 años.\n\nMarca Redes & Piolas SERCODAM.',
          ruta_imagen: '/images/fichas-tecnicas/red-nylon-proteccion.jpg',
          ruta_imagen_grande: '/images/fichas-tecnicas/red-nylon-proteccion-grande.jpg',
          categorias: ['proteccion', 'industrial', 'construccion'],
          activo: true
        },
        {
          nombre_red: 'Red Deportiva Nylon',
          tipo_red: 'nylon',
          codigo_producto: 'ND-001',
          calibre: 'No. 42 x 3"',
          luz_malla: '7.5 cm x 7.5 cm',
          resistencia: '800 - 1,000 KG por m2',
          certificacion: 'UNE EN – 1263-12004',
          material: 'Nylon 100% multifilamento',
          color: 'Verde',
          tratamiento: 'Resinas por termo-fijación',
          propiedades: 'Red deportiva de alta resistencia, ideal para campos de fútbol, tenis y otros deportes. Resistente a la intemperie y rayos UV.',
          ficha_tecnica_completa: 'Características de la red deportiva:\n\nEn calibre No. 42 x 3" (7.5 cm x 7.5 cm)\nCertificación UNE EN – 1263-12004\n\nRed deportiva de nylon 100% multifilamento, confeccionada en tejido cuadrado sin nudo para mayor resistencia. Resistencia de 800 - 1,000 KG por m2.\n\nColor verde, tratada con resinas por termo-fijación, resistente a la intemperie y rayos UV.\n\n*Reforzada en todas sus orillas con piola Cal.80.\n\nGarantía de fábrica 3 años.\n\nMarca Redes & Piolas SERCODAM.',
          ruta_imagen: '/images/fichas-tecnicas/red-deportiva.jpg',
          ruta_imagen_grande: '/images/fichas-tecnicas/red-deportiva-grande.jpg',
          categorias: ['deportiva', 'futbol', 'tenis'],
          activo: true
        },
        {
          nombre_red: 'Red de Golf Nylon',
          tipo_red: 'nylon',
          codigo_producto: 'NG-001',
          calibre: 'No. 36 x 2.5"',
          luz_malla: '6 cm x 6 cm',
          resistencia: '600 - 800 KG por m2',
          certificacion: 'UNE EN – 1263-12004',
          material: 'Nylon 100% multifilamento',
          color: 'Verde oscuro',
          tratamiento: 'Resinas por termo-fijación',
          propiedades: 'Red especializada para campos de golf, con malla fina para capturar pelotas de golf.',
          ficha_tecnica_completa: 'Características de la red de golf:\n\nEn calibre No. 36 x 2.5" (6 cm x 6 cm)\nCertificación UNE EN – 1263-12004\n\nRed especializada para campos de golf, confeccionada en nylon 100% multifilamento. Resistencia de 600 - 800 KG por m2.\n\nColor verde oscuro, malla fina diseñada específicamente para capturar pelotas de golf.\n\n*Reforzada en todas sus orillas con piola Cal.60.\n\nGarantía de fábrica 3 años.\n\nMarca Redes & Piolas SERCODAM.',
          ruta_imagen: '/images/fichas-tecnicas/red-golf.jpg',
          ruta_imagen_grande: '/images/fichas-tecnicas/red-golf-grande.jpg',
          categorias: ['golf', 'deportiva'],
          activo: true
        },
        {
          nombre_red: 'Malla Sombra Polipropileno',
          tipo_red: 'polipropileno',
          codigo_producto: 'MS-001',
          calibre: 'No. 24 x 2"',
          luz_malla: '4 cm x 4 cm',
          resistencia: '400 - 600 KG por m2',
          certificacion: 'UNE EN – 1263-12004',
          material: 'Polipropileno 100%',
          color: 'Negro',
          tratamiento: 'Estabilizado contra rayos UV',
          propiedades: 'Malla sombra de polipropileno, ideal para protección solar en invernaderos, estacionamientos y áreas recreativas.',
          ficha_tecnica_completa: 'Características de la malla sombra:\n\nEn calibre No. 24 x 2" (4 cm x 4 cm)\nCertificación UNE EN – 1263-12004\n\nMalla sombra de polipropileno 100%, confeccionada en tejido cuadrado. Resistencia de 400 - 600 KG por m2.\n\nColor negro, estabilizada contra rayos UV, ideal para protección solar.\n\n*Reforzada en todas sus orillas con piola Cal.40.\n\nGarantía de fábrica 2 años.\n\nMarca Redes & Piolas SERCODAM.',
          ruta_imagen: '/images/fichas-tecnicas/malla-sombra.jpg',
          ruta_imagen_grande: '/images/fichas-tecnicas/malla-sombra-grande.jpg',
          categorias: ['sombra', 'agricultura', 'proteccion'],
          activo: true
        },
        {
          nombre_red: 'Lona Industrial PVC',
          tipo_red: 'lona',
          codigo_producto: 'LI-001',
          calibre: 'N/A',
          luz_malla: 'N/A',
          resistencia: '800 - 1,200 KG por m2',
          certificacion: 'UNE EN – 1263-12004',
          material: 'PVC reforzado con fibra de poliéster',
          color: 'Azul',
          tratamiento: 'Impermeabilizado y resistente a químicos',
          propiedades: 'Lona industrial de PVC reforzado, impermeable y resistente a químicos, ideal para cubiertas y protección industrial.',
          ficha_tecnica_completa: 'Características de la lona industrial:\n\nLona de PVC reforzado con fibra de poliéster\nCertificación UNE EN – 1263-12004\n\nLona industrial impermeabilizada y resistente a químicos, ideal para cubiertas y protección industrial.\n\nColor azul, con resistencia de 800 - 1,200 KG por m2.\n\n*Reforzada en todas sus orillas con cinta de PVC.\n\nGarantía de fábrica 2 años.\n\nMarca Redes & Piolas SERCODAM.',
          ruta_imagen: '/images/fichas-tecnicas/lona-industrial.jpg',
          ruta_imagen_grande: '/images/fichas-tecnicas/lona-industrial-grande.jpg',
          categorias: ['industrial', 'proteccion', 'cubiertas'],
          activo: true
        }
      ]);
    });
}; 