// Script de prueba integral para órdenes y PDF
const db = require('./src/config/database');
const pdfService = require('./src/services/pdfService');
const fs = require('fs');

async function main() {
  try {
    console.log('--- Prueba integral de orden y PDF ---');

    // 1. Buscar valores aceptados de paños, materiales y herramientas
    const panos = await db('pano').where('estado', 'bueno').limit(1);
    const materiales = await db('materiales_extras').where('cantidad_disponible', '>', 0).limit(1);
    const herramientas = await db('herramientas').where('disponibilidad', 'Disponible').limit(1);
    if (!panos.length || !materiales.length || !herramientas.length) {
      throw new Error('No hay suficientes paños, materiales o herramientas disponibles para la prueba.');
    }
    const pano = panos[0];
    const material = materiales[0];
    const herramienta = herramientas[0];
    console.log('Paño seleccionado:', pano);
    console.log('Material seleccionado:', material);
    console.log('Herramienta seleccionada:', herramienta);

    // 2. Crear orden de producción
    const ordenPayload = {
      cliente: 'Prueba Integral',
      observaciones: 'Orden de prueba integral',
      prioridad: 'media',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      materiales: [
        {
          id_item: pano.id_item,
          cantidad: 1,
          tipo_item: 'PANO',
          largo_tomar: pano.largo_m,
          ancho_tomar: pano.ancho_m,
          notas: 'Prueba de paño'
        },
        {
          id_item: material.id_item,
          cantidad: 1,
          tipo_item: 'EXTRA',
          notas: 'Prueba de material'
        }
      ],
      herramientas: [
        {
          id_item: herramienta.id_item,
          cantidad: 1,
          notas: 'Prueba de herramienta'
        }
      ]
    };
    // Simular usuario admin
    const adminUser = await db('usuario').where('username', 'admin').first();
    if (!adminUser) throw new Error('Usuario admin no encontrado');
    console.log('Usuario admin:', adminUser);

    // Crear la orden usando la lógica del backend (simulación directa)
    // Aquí podrías llamar a la API REST si lo prefieres, pero para la prueba usamos la lógica directa
    // ---
    // 1. Obtener stock antes
    const panoAntes = await db('pano').where('id_item', pano.id_item).first();
    const materialAntes = await db('materiales_extras').where('id_item', material.id_item).first();
    // 2. Insertar orden
    const [{ id_op }] = await db('orden_produccion').insert({
      cliente: ordenPayload.cliente,
      observaciones: ordenPayload.observaciones,
      prioridad: ordenPayload.prioridad,
      fecha_inicio: ordenPayload.fecha_inicio,
      fecha_fin: ordenPayload.fecha_fin,
      estado: 'en_proceso',
      fecha_op: new Date(),
      fecha_creacion: new Date(),
      numero_op: `TEST-${Date.now()}`
    }).returning('id_op');
    // 3. Insertar detalles y descontar stock
    await db('orden_produccion_detalle').insert({
      id_op,
      id_item: pano.id_item,
      tipo_item: 'PANO',
      cantidad: 1,
      notas: 'Prueba de paño',
      estado: 'en_proceso'
    });
    await db('orden_produccion_detalle').insert({
      id_op,
      id_item: material.id_item,
      tipo_item: 'EXTRA',
      cantidad: 1,
      notas: 'Prueba de material',
      estado: 'en_proceso'
    });
    await db('herramienta_ordenada').insert({
      id_op,
      id_item: herramienta.id_item,
      tipo_movimiento: 'ASIGNACION',
      cantidad: 1,
      notas: 'Prueba de herramienta',
      estado: 'en_proceso'
    });
    // Descontar stock
    await db('pano').where('id_item', pano.id_item).decrement('area_m2', pano.largo_m * pano.ancho_m);
    await db('materiales_extras').where('id_item', material.id_item).decrement('cantidad_disponible', 1);
    // 4. Verificar stock después
    const panoDespues = await db('pano').where('id_item', pano.id_item).first();
    const materialDespues = await db('materiales_extras').where('id_item', material.id_item).first();
    console.log('Stock de paño antes:', panoAntes.area_m2, 'después:', panoDespues.area_m2);
    console.log('Stock de material antes:', materialAntes.cantidad_disponible, 'después:', materialDespues.cantidad_disponible);
    // 5. Verificar que la orden se creó correctamente
    const orden = await db('orden_produccion').where('id_op', id_op).first();
    const detalles = await db('orden_produccion_detalle').where('id_op', id_op);
    const herramientasOrden = await db('herramienta_ordenada').where('id_op', id_op);
    console.log('Orden creada:', orden);
    console.log('Detalles:', detalles);
    console.log('Herramientas:', herramientasOrden);
    // 6. Generar PDF
    const ordenData = {
      ...orden,
      panos: [
        { ...pano, cantidad: 1, largo_m: pano.largo_m, ancho_m: pano.ancho_m, precio_m2: pano.precio_x_unidad, tipo_red: pano.tipo_red, calibre: pano.calibre, cuadro: pano.cuadro, torsion: pano.torsion, color: pano.color, refuerzo: pano.refuerzo }
      ],
      materiales: [
        { ...material, cantidad: 1, precioxunidad: material.precioxunidad }
      ],
      herramientas: [
        { ...herramienta, cantidad: 1 }
      ]
    };
    const pdfResult = await pdfService.generateOrdenProduccionPDF(ordenData);
    console.log('PDF generado:', pdfResult);
    if (!fs.existsSync(pdfResult.filepath)) throw new Error('El archivo PDF no se generó correctamente');
    // 7. (Opcional) Leer y mostrar parte del contenido del PDF (solo para confirmar que existe)
    const stats = fs.statSync(pdfResult.filepath);
    console.log('Tamaño del PDF:', stats.size, 'bytes');
    // 8. LIMPIEZA DE DATOS DE PRUEBA
    console.log('Limpiando datos de prueba...');
    // Restaurar stock
    await db('pano').where('id_item', pano.id_item).update({ area_m2: panoAntes.area_m2 });
    await db('materiales_extras').where('id_item', material.id_item).update({ cantidad_disponible: materialAntes.cantidad_disponible });
    // Eliminar detalles y orden
    await db('herramienta_ordenada').where('id_op', id_op).del();
    await db('orden_produccion_detalle').where('id_op', id_op).del();
    await db('orden_produccion').where('id_op', id_op).del();
    console.log('Datos de prueba eliminados y stock restaurado.');
    // Cerrar conexiones
    await db.destroy();
    console.log('Conexión a la base de datos cerrada.');
    console.log('--- Prueba integral completada con éxito ---');
  } catch (err) {
    console.error('Error en la prueba integral:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 