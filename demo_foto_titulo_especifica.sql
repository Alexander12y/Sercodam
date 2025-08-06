-- Demo: Cómo agregar fotos específicas por título de proyecto
-- Esto demuestra la flexibilidad del diseño normalizado

-- Ejemplo 1: Agregar una foto específica para "Redes para Golf"
-- (usando una imagen específica de golf en lugar de la genérica deportiva)
UPDATE catalogo_1.titulo_proyecto 
SET foto_titulo = 'golf-specific.png' 
WHERE titulo_proyecto = 'Redes para Golf';

-- Ejemplo 2: Agregar una foto específica para "Redes para Béisbol"
UPDATE catalogo_1.titulo_proyecto 
SET foto_titulo = 'beisbol-specific.png' 
WHERE titulo_proyecto = 'Redes para Béisbol';

-- Ejemplo 3: Agregar una foto específica para "Redes para Fútbol"
UPDATE catalogo_1.titulo_proyecto 
SET foto_titulo = 'futbol-specific.png' 
WHERE titulo_proyecto = 'Redes para Fútbol';

-- Verificar los cambios
SELECT 
    tp.titulo_proyecto,
    tp.foto_titulo,
    tpro.foto_tipo,
    CASE 
        WHEN tp.foto_titulo IS NOT NULL THEN tp.foto_titulo
        ELSE tpro.foto_tipo
    END as foto_final
FROM catalogo_1.titulo_proyecto tp
JOIN catalogo_1.tipo_proyecto tpro ON tp.tipo_proyecto = tpro.tipo_proyecto
WHERE tp.foto_titulo IS NOT NULL
ORDER BY tp.titulo_proyecto;

-- Mostrar todos los títulos con su lógica de foto
SELECT 
    tp.titulo_proyecto,
    tp.tipo_proyecto,
    tp.foto_titulo,
    tpro.foto_tipo,
    CASE 
        WHEN tp.foto_titulo IS NOT NULL THEN tp.foto_titulo
        ELSE tpro.foto_tipo
    END as foto_final,
    CASE 
        WHEN tp.foto_titulo IS NOT NULL THEN 'Específica'
        ELSE 'Tipo (fallback)'
    END as tipo_foto
FROM catalogo_1.titulo_proyecto tp
JOIN catalogo_1.tipo_proyecto tpro ON tp.tipo_proyecto = tpro.tipo_proyecto
ORDER BY tp.tipo_proyecto, tp.titulo_proyecto; 