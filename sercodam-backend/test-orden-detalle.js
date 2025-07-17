// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testOrdenDetalle() {
  try {
    console.log('🔍 Probando obtención de detalle de orden...');
    
    // Obtener todas las órdenes que tengan paños
    const ordenesConPanos = await db('panos_sobrantes as ps')
      .join('orden_produccion as op', 'ps.id_op', 'op.id_op')
      .join('pano as p', 'ps.id_item_padre', 'p.id_item')
      .where('ps.estado', '!=', 'Descartado')
      .select('op.id_op', 'op.numero_op', 'ps.altura_m as largo_m', 'ps.ancho_m')
      .orderBy('op.id_op', 'desc');
    
    if (ordenesConPanos.length === 0) {
      console.log('❌ No se encontró ninguna orden con paños');
      return;
    }
    
    console.log(`✅ Se encontraron ${ordenesConPanos.length} órdenes con paños`);
    
    // Buscar una orden con dimensiones más razonables
    let ordenSeleccionada = null;
    for (const orden of ordenesConPanos) {
      const largo = Number(orden.largo_m) || 0;
      const ancho = Number(orden.ancho_m) || 0;
      
      // Buscar dimensiones más razonables (menos de 100 metros)
      if (largo > 0 && largo < 100 && ancho > 0 && ancho < 100) {
        ordenSeleccionada = orden;
        console.log(`✅ Orden seleccionada con dimensiones razonables: ${orden.numero_op} (ID: ${orden.id_op})`);
        console.log(`   Dimensiones: ${largo.toFixed(2)} x ${ancho.toFixed(2)} m`);
        break;
      }
    }
    
    // Si no hay dimensiones razonables, usar la primera
    if (!ordenSeleccionada) {
      ordenSeleccionada = ordenesConPanos[0];
      console.log(`⚠️ Usando orden con dimensiones grandes: ${ordenSeleccionada.numero_op} (ID: ${ordenSeleccionada.id_op})`);
      console.log(`   Dimensiones: ${Number(ordenSeleccionada.largo_m).toFixed(2)} x ${Number(ordenSeleccionada.ancho_m).toFixed(2)} m`);
    }
    
    // Obtener orden básica
    const orden = await db('orden_produccion as op')
      .leftJoin('cliente as c', 'op.id_cliente', 'c.id_cliente')
      .where('op.id_op', ordenSeleccionada.id_op)
      .select('op.*', 'c.nombre_cliente', 'c.email as cliente_email', 'c.telefono as cliente_telefono')
      .first();
      
    console.log('✅ Orden básica obtenida');
    
    // Obtener paños detallados desde panos_sobrantes
    const panos = await db('panos_sobrantes as ps')
      .join('pano as p', 'ps.id_item_padre', 'p.id_item')
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
      .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
      .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
      .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
      .where('ps.id_op', ordenSeleccionada.id_op)
      .andWhere('ps.estado', '!=', 'Descartado')
      .select(
        'ps.id_remnant as id_detalle', 
        'ps.altura_m as largo_m', 
        'ps.ancho_m as ancho_m',
        'ps.area_m2',
        'p.*',
        'rp.tipo_red', 'rp.marca', 'rp.descripcion as red_descripcion',
        'n.calibre as nylon_calibre', 'n.cuadro as nylon_cuadro', 'n.torsion as nylon_torsion', 'n.refuerzo as nylon_refuerzo',
        'l.color as lona_color', 'l.presentacion as lona_presentacion',
        'pp.grosor as polipropileno_grosor', 'pp.cuadro as polipropileno_cuadro',
        'ms.color_tipo_red as malla_color', 'ms.presentacion as malla_presentacion'
      );

    console.log(`✅ Paños obtenidos: ${panos.length}`);
    console.log('📋 Datos de paños:');
    panos.forEach((pano, index) => {
      console.log(`  ${index + 1}. ID: ${pano.id_item}, Tipo: ${pano.tipo_red}, Cantidad: ${pano.cantidad}, Notas: ${pano.notas}`);
      console.log(`     Dimensiones: ${Number(pano.largo_m).toFixed(2)} x ${Number(pano.ancho_m).toFixed(2)} m`);
    });
    
    // Obtener materiales extras
    const materialesExtras = await db('orden_produccion_detalle as opd')
      .join('materiales_extras as me', 'opd.id_item', 'me.id_item')
      .where('opd.id_op', ordenSeleccionada.id_op)
      .andWhere('opd.tipo_item', 'EXTRA')
      .select(
        'opd.id_detalle', 'opd.cantidad', 'opd.notas',
        'me.id_item', 'me.id_material_extra', 'me.descripcion', 'me.categoria', 'me.unidad'
      );
      
    console.log(`✅ Materiales extras obtenidos: ${materialesExtras.length}`);
    
    // Obtener herramientas
    const herramientasAsignadas = await db('herramienta_ordenada as ho')
      .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
      .where('ho.id_op', ordenSeleccionada.id_op)
      .select(
        'ho.id_op', 'ho.cantidad', 'ho.fecha',
        'h.id_item', 'h.id_herramienta', 'h.descripcion', 'h.categoria', 'h.marca', 'h.unidad'
      )
      .orderBy('ho.fecha', 'desc');
      
    console.log(`✅ Herramientas obtenidas: ${herramientasAsignadas.length}`);
    
    // Simular respuesta del controlador
    const responseData = {
      success: true,
      data: {
        orden,
        panos,
        materiales: materialesExtras,
        herramientas: herramientasAsignadas
      }
    };
    
    console.log('\n📊 Resumen de datos:');
    console.log(`  - Orden: ${responseData.data.orden ? '✅' : '❌'}`);
    console.log(`  - Paños: ${responseData.data.panos.length} elementos`);
    console.log(`  - Materiales: ${responseData.data.materiales.length} elementos`);
    console.log(`  - Herramientas: ${responseData.data.herramientas.length} elementos`);
    
    console.log('\n🔍 Verificando estructura de datos...');
    if (responseData.data.panos.length > 0) {
      const primerPano = responseData.data.panos[0];
      console.log('  Primer paño:');
      console.log(`    - ID: ${primerPano.id_item}`);
      console.log(`    - Tipo: ${primerPano.tipo_red}`);
      console.log(`    - Cantidad: ${primerPano.cantidad}`);
      console.log(`    - Notas: ${primerPano.notas}`);
      console.log(`    - Largo: ${primerPano.largo_m}`);
      console.log(`    - Ancho: ${primerPano.ancho_m}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

testOrdenDetalle(); 