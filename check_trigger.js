const db = require('./src/config/database');

async function checkTrigger() {
    try {
        console.log('🔍 === VERIFICANDO TRIGGER ===\n');
        
        // Verificar si el trigger existe y está habilitado
        const triggerResult = await db.raw(`
            SELECT 
                trigger_name,
                event_manipulation,
                action_timing,
                action_statement,
                action_orientation
            FROM information_schema.triggers 
            WHERE trigger_name = 'trg_mov_inv_on_pano_update_area'
        `);
        
        console.log('📋 Trigger info:', triggerResult.rows);
        
        // Verificar si está habilitado
        const enabledResult = await db.raw(`
            SELECT 
                schemaname,
                tablename,
                triggername,
                tgtype,
                tgenabled
            FROM pg_trigger 
            WHERE tgname = 'trg_mov_inv_on_pano_update_area'
        `);
        
        console.log('\n📋 Trigger enabled:', enabledResult.rows);
        
        // Verificar la función del trigger
        const functionResult = await db.raw(`
            SELECT 
                proname,
                prosrc
            FROM pg_proc 
            WHERE proname = 'trg_mov_inv_on_pano_update_area'
        `);
        
        console.log('\n📋 Trigger function:', functionResult.rows);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

checkTrigger(); 