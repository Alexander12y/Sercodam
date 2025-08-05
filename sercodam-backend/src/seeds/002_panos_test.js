const db = require('../config/database');

exports.seed = async function(knex) {
  // Limpiar tabla existente
  await knex('pano').del();
  
  // Insertar datos de prueba
  const panos = [
    {
      id_item: 1,
      tipo_red: 'lona',
      area_m2: 10.5,
      estado: 'bueno',
      ubicacion: 'Almacén A, Estante 1',
      precio_x_unidad: 25.50,
      descripcion: 'Lona resistente para exteriores',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id_item: 2,
      tipo_red: 'nylon',
      area_m2: 8.0,
      estado: 'regular',
      ubicacion: 'Almacén A, Estante 2',
      precio_x_unidad: 18.75,
      descripcion: 'Nylon para sombra',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id_item: 3,
      tipo_red: 'polipropileno',
      area_m2: 15.0,
      estado: 'bueno',
      ubicacion: 'Almacén B, Estante 1',
      precio_x_unidad: 22.00,
      descripcion: 'Polipropileno de alta calidad',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id_item: 4,
      tipo_red: 'malla sombra',
      area_m2: 12.5,
      estado: 'usado 50%',
      ubicacion: 'Almacén B, Estante 2',
      precio_x_unidad: 30.00,
      descripcion: 'Malla sombra 70%',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id_item: 5,
      tipo_red: 'lona',
      area_m2: 6.0,
      estado: 'malo',
      ubicacion: 'Almacén C, Estante 1',
      precio_x_unidad: 15.00,
      descripcion: 'Lona usada, necesita reparación',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('pano').insert(panos);
  
  console.log('✅ Datos de prueba de paños insertados correctamente');
}; 