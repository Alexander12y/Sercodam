-- =====================================================
-- EJEMPLO: FUNCIÓN PARA CONVERTIR COTIZACIÓN A ORDEN DE PRODUCCIÓN
-- =====================================================

-- Función para convertir una cotización a orden de producción
CREATE OR REPLACE FUNCTION catalogo_1.convertir_cotizacion_a_orden(p_id_cotizacion INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_cotizacion RECORD;
    v_detalle RECORD;
    v_nuevo_id_op INTEGER;
    v_numero_op VARCHAR(50);
    v_fecha_actual DATE;
    v_año VARCHAR(4);
    v_mes VARCHAR(2);
    v_dia VARCHAR(2);
    v_ultima_orden RECORD;
    v_numero_orden INTEGER;
BEGIN
    -- 1. Verificar que la cotización está en estado 'enviada'
    SELECT * INTO v_cotizacion 
    FROM catalogo_1.cotizacion 
    WHERE id_cotizacion = p_id_cotizacion 
    AND estado = 'enviada';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cotización no encontrada o no está en estado enviada';
    END IF;
    
    -- 2. Generar número de orden único (igual que en el código Node.js)
    v_fecha_actual := CURRENT_DATE;
    v_año := EXTRACT(YEAR FROM v_fecha_actual)::VARCHAR;
    v_mes := LPAD(EXTRACT(MONTH FROM v_fecha_actual)::VARCHAR, 2, '0');
    v_dia := LPAD(EXTRACT(DAY FROM v_fecha_actual)::VARCHAR, 2, '0');
    
    -- Buscar último número del día
    SELECT * INTO v_ultima_orden
    FROM catalogo_1.orden_produccion
    WHERE numero_op LIKE 'OP-' || v_año || v_mes || v_dia || '-%'
    ORDER BY numero_op DESC
    LIMIT 1;
    
    IF FOUND THEN
        v_numero_orden := SPLIT_PART(v_ultima_orden.numero_op, '-', 3)::INTEGER + 1;
    ELSE
        v_numero_orden := 1;
    END IF;
    
    v_numero_op := 'OP-' || v_año || v_mes || v_dia || '-' || LPAD(v_numero_orden::VARCHAR, 3, '0');
    
    -- 3. Crear orden de producción
    INSERT INTO catalogo_1.orden_produccion (
        numero_op,
        fecha_op,
        cliente,
        id_cliente,
        id_cotizacion, -- ← NUEVA RELACIÓN
        observaciones,
        estado,
        prioridad,
        fecha_creacion
    ) VALUES (
        v_numero_op,
        NOW(),
        v_cotizacion.nombre_cliente,
        v_cotizacion.id_cliente,
        p_id_cotizacion,
        'Generada desde cotización ' || v_cotizacion.numero_cotizacion,
        'por aprobar',
        'media',
        NOW()
    ) RETURNING id_op INTO v_nuevo_id_op;
    
    -- 4. Migrar detalle de cotización a orden de producción
    FOR v_detalle IN 
        SELECT * FROM catalogo_1.cotizacion_detalle 
        WHERE id_cotizacion = p_id_cotizacion 
        ORDER BY orden_index
    LOOP
        INSERT INTO catalogo_1.orden_produccion_detalle (
            id_op,
            id_item,
            cantidad,
            notas,
            catalogo,
            tipo_item,
            estado
        ) VALUES (
            v_nuevo_id_op,
            v_detalle.id_item,
            v_detalle.cantidad,
            v_detalle.notas || COALESCE(' | Características: ' || v_detalle.caracteristicas, ''),
            v_detalle.catalogo,
            v_detalle.tipo_item,
            'ACTIVO' -- Estado inicial para orden_produccion_detalle
        );
    END LOOP;
    
    -- 5. Marcar cotización como convertida
    UPDATE catalogo_1.cotizacion 
    SET estado = 'convertida'
    WHERE id_cotizacion = p_id_cotizacion;
    
    -- Retornar el ID de la nueva orden
    RETURN v_nuevo_id_op;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error convirtiendo cotización: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJEMPLO DE USO
-- =====================================================

-- Ejemplo de cómo usar la función:
-- SELECT catalogo_1.convertir_cotizacion_a_orden(1) as nueva_orden_id;

-- Consulta para verificar la conversión:
/*
SELECT 
    c.numero_cotizacion,
    c.estado as estado_cotizacion,
    op.numero_op,
    op.estado as estado_orden,
    op.id_cotizacion
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.orden_produccion op ON c.id_cotizacion = op.id_cotizacion
WHERE c.estado = 'convertida';
*/

PRINT 'Función de conversión creada exitosamente!'; 