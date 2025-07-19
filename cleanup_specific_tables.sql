-- Script para limpiar tablas específicas manteniendo materiales, herramientas, inventario_item, nylon, polipropileno, malla_sombra, lona y usuarios
-- Para inventario_item solo borrar registros específicos de paños

-- 1. Borrar registros específicos de paños en inventario_item (solo los IDs mencionados)
DELETE FROM catalogo_1.inventario_item 
WHERE id_item IN (560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 574)
AND tipo_item = 'PANO';

-- 2. Borrar todas las tablas relacionadas con órdenes de producción
DELETE FROM catalogo_1.orden_produccion_detalle;
DELETE FROM catalogo_1.orden_produccion;

-- 3. Borrar tablas de cortes y trabajos
DELETE FROM catalogo_1.real_corte_pieza;
DELETE FROM catalogo_1.plan_corte_pieza;
DELETE FROM catalogo_1.trabajo_corte;

-- 4. Borrar tablas de paños
DELETE FROM catalogo_1.panos_sobrantes;
DELETE FROM catalogo_1.pano;

-- 5. Borrar movimientos de inventario
DELETE FROM catalogo_1.movimiento_inventario;

-- 6. Borrar materiales extras
DELETE FROM catalogo_1.materiales_extras;

-- 7. Borrar herramientas ordenadas
DELETE FROM catalogo_1.herramienta_ordenada;

-- 8. Borrar clientes y logs
DELETE FROM catalogo_1.cliente_log;
DELETE FROM catalogo_1.cliente;

-- 9. Borrar reportes
DELETE FROM catalogo_1.reporte_variacion;
DELETE FROM catalogo_1.red_producto;

-- 10. Borrar drafts
DELETE FROM catalogo_1.ordenes_draft;

-- 11. Borrar estados de catálogo (excepto los básicos que podrían estar en uso)
-- Comentado por seguridad - descomenta si estás seguro
-- DELETE FROM catalogo_1.estado_catalogo;

-- Verificar que se borraron los registros correctos
SELECT 'Registros borrados de inventario_item:' as info;
SELECT id_item, tipo_item, fecha_creacion 
FROM catalogo_1.inventario_item 
WHERE tipo_item = 'PANO'
ORDER BY id_item;

SELECT 'Total de registros restantes por tipo:' as info;
SELECT tipo_item, COUNT(*) as total
FROM catalogo_1.inventario_item 
GROUP BY tipo_item
ORDER BY tipo_item; 