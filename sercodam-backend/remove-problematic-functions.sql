-- Eliminar funciones problemáticas que causan errores de foreign key
DROP FUNCTION IF EXISTS fn_restaurar_inventario_completo_cancelada(INTEGER);
DROP FUNCTION IF EXISTS fn_restaurar_inventario_materiales_cancelada(INTEGER);
DROP FUNCTION IF EXISTS fn_restaurar_inventario_panos_cancelada(INTEGER);

-- Eliminar triggers relacionados
DROP TRIGGER IF EXISTS trg_restaurar_inventario_cancelacion ON orden_produccion;
DROP FUNCTION IF EXISTS trg_restaurar_inventario_cancelacion();

-- Verificar que se eliminaron
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%restaurar_inventario%' 
AND routine_schema = 'catalogo_1'; 