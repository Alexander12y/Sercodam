const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testPanoInventory() {
    try {
        console.log('🧪 Iniciando pruebas de inventario de paños...');
        
        // 1. Probar función de generación de notas
        console.log('\n1. Probando función de generación de notas...');
        try {
            const testResult = await db.raw('SELECT fn_generar_nota_pano(1, 2.5, \'largo\') as nota');
            console.log('✅ Nota generada:', testResult.rows[0]?.nota || 'Sin resultado');
        } catch (error) {
            console.log('❌ Error generando nota:', error.message);
        }
        
        // 2. Verificar estructura de tabla orden_produccion_detalle
        console.log('\n2. Verificando estructura de orden_produccion_detalle...');
        try {
            const columns = await db.raw(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'orden_produccion_detalle'
                ORDER BY ordinal_position
            `);
            console.log('✅ Columnas encontradas:');
            columns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        } catch (error) {
            console.log('❌ Error verificando estructura:', error.message);
        }
        
        // 3. Verificar funciones existentes
        console.log('\n3. Verificando funciones SQL...');
        const funciones = [
            'fn_generar_nota_pano',
            'fn_restaurar_inventario_panos_cancelada',
            'fn_limpiar_detalle_completadas',
            'fn_cancelar_ordenes_30_dias'
        ];
        
        for (const funcion of funciones) {
            try {
                const result = await db.raw(`SELECT routine_name FROM information_schema.routines WHERE routine_name = ?`, [funcion]);
                if (result.rows.length > 0) {
                    console.log(`✅ ${funcion}: OK`);
                } else {
                    console.log(`❌ ${funcion}: No encontrada`);
                }
            } catch (error) {
                console.log(`❌ ${funcion}: Error - ${error.message}`);
            }
        }
        
        // 4. Verificar triggers
        console.log('\n4. Verificando triggers...');
        try {
            const triggers = await db.raw(`
                SELECT trigger_name, event_manipulation, action_timing
                FROM information_schema.triggers 
                WHERE trigger_name = 'trg_orden_cancelada'
            `);
            if (triggers.rows.length > 0) {
                console.log('✅ Trigger trg_orden_cancelada encontrado');
                triggers.rows.forEach(trigger => {
                    console.log(`   - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
                });
            } else {
                console.log('❌ Trigger trg_orden_cancelada no encontrado');
            }
        } catch (error) {
            console.log('❌ Error verificando triggers:', error.message);
        }
        
        // 5. Verificar datos de ejemplo
        console.log('\n5. Verificando datos de ejemplo...');
        try {
            const panos = await db('pano').select('id_item', 'largo_m', 'ancho_m', 'area_m2').limit(3);
            console.log(`✅ Encontrados ${panos.length} paños de ejemplo:`);
            panos.forEach(pano => {
                console.log(`   - ID: ${pano.id_item}, Largo: ${pano.largo_m}m, Ancho: ${pano.ancho_m}m, Área: ${pano.area_m2}m²`);
            });
        } catch (error) {
            console.log('❌ Error verificando datos de ejemplo:', error.message);
        }
        
        // 6. Verificar tablas de catálogo
        console.log('\n6. Verificando tablas de catálogo...');
        const tablasCatalogo = ['nylon', 'polipropileno', 'lona', 'malla_sombra'];
        for (const tabla of tablasCatalogo) {
            try {
                const count = await db(tabla).count('* as total');
                console.log(`✅ ${tabla}: ${count[0].total} registros`);
            } catch (error) {
                console.log(`❌ ${tabla}: Error - ${error.message}`);
            }
        }
        
        console.log('\n🎉 Pruebas de inventario de paños completadas');
        
    } catch (error) {
        console.error('❌ Error en pruebas:', error);
    } finally {
        await db.destroy();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testPanoInventory();
}

module.exports = testPanoInventory; 