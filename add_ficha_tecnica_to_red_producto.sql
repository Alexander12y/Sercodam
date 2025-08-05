-- Agregar campos de ficha técnica y foto a la tabla red_producto
-- Ejecutar este archivo SQL directamente en la base de datos

-- Verificar si los campos ya existen antes de agregarlos
DO $$
BEGIN
    -- Agregar campo ficha_tecnica si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'catalogo_1' 
        AND table_name = 'red_producto' 
        AND column_name = 'ficha_tecnica'
    ) THEN
        ALTER TABLE catalogo_1.red_producto ADD COLUMN ficha_tecnica TEXT;
        RAISE NOTICE 'Campo ficha_tecnica agregado exitosamente';
    ELSE
        RAISE NOTICE 'Campo ficha_tecnica ya existe';
    END IF;

    -- Agregar campo foto si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'catalogo_1' 
        AND table_name = 'red_producto' 
        AND column_name = 'foto'
    ) THEN
        ALTER TABLE catalogo_1.red_producto ADD COLUMN foto TEXT;
        RAISE NOTICE 'Campo foto agregado exitosamente';
    ELSE
        RAISE NOTICE 'Campo foto ya existe';
    END IF;
END $$;

-- Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN catalogo_1.red_producto.ficha_tecnica IS 'Ficha técnica completa del producto de red con especificaciones técnicas, certificaciones y características';
COMMENT ON COLUMN catalogo_1.red_producto.foto IS 'Ruta de la imagen del producto de red';

-- Verificar que los campos se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
AND table_name = 'red_producto' 
AND column_name IN ('ficha_tecnica', 'foto');

-- Ejemplo de inserción de datos de prueba para nylon (opcional)
-- INSERT INTO catalogo_1.red_producto (id_mcr, tipo_red, unidad, marca, descripcion, ficha_tecnica, foto) 
-- VALUES (
--   'RED001', 
--   'nylon', 
--   'm²', 
--   'Sercodam', 
--   'Red de nylon para protección', 
--   'En calibre No. 60 x 4" (10 cm x 10 cm). Certificación UNE EN – 1263-12004. Confeccionada en SQ. (cuadrada) tejida sin nudo a la luz de malla para mayor resistencia, Trenzada, (16 hilos) Con una resistencia de 1,400 – 1,600 KG por m2., 100% reciclable, en color negro, tratada con resinas (bondeol) por termo-fijación, a base de presión de vapor, con resistencia a la intemperie, rayos UV y a la abrasión, muy baja absorción al agua (95% impermeable), no digerible por algún insecto, 100% inerte, no produce bacterias, no acumula electricidad estática, mantiene su tenacidad en ambientes ácidos y alcalinos, estirada y planchada a lo largo y ancho en vapor y aire seco para evitar su deformación. *Reforzada en todas sus orillas con piola Cal.120. Garantía de fábrica 5 años. Marca Redes & Piolas SERCODAM.',
--   'redes/nylon-calibre-60.jpg'
-- ) ON CONFLICT (id_mcr) DO UPDATE SET
--   ficha_tecnica = EXCLUDED.ficha_tecnica,
--   foto = EXCLUDED.foto;

-- Ejemplo para polipropileno
-- INSERT INTO catalogo_1.red_producto (id_mcr, tipo_red, unidad, marca, descripcion, ficha_tecnica, foto) 
-- VALUES (
--   'RED002', 
--   'polipropileno', 
--   'm²', 
--   'Sercodam', 
--   'Red de polipropileno para protección', 
--   'En calibre No. 50 x 3" (7.5 cm x 7.5 cm). Certificación UNE EN – 1263-12004. Confeccionada en SQ. (cuadrada) tejida sin nudo a la luz de malla para mayor resistencia, Trenzada, (12 hilos) Con una resistencia de 1,200 – 1,400 KG por m2., 100% reciclable, en color verde, tratada con resinas especiales por termo-fijación, con resistencia a la intemperie, rayos UV y a la abrasión, muy baja absorción al agua (90% impermeable), no digerible por algún insecto, 100% inerte, no produce bacterias, no acumula electricidad estática, mantiene su tenacidad en ambientes ácidos y alcalinos, estirada y planchada a lo largo y ancho en vapor y aire seco para evitar su deformación. *Reforzada en todas sus orillas con piola Cal.100. Garantía de fábrica 3 años. Marca Redes & Piolas SERCODAM.',
--   'redes/polipropileno-calibre-50.jpg'
-- ) ON CONFLICT (id_mcr) DO UPDATE SET
--   ficha_tecnica = EXCLUDED.ficha_tecnica,
--   foto = EXCLUDED.foto;

-- Ejemplo para lona
-- INSERT INTO catalogo_1.red_producto (id_mcr, tipo_red, unidad, marca, descripcion, ficha_tecnica, foto) 
-- VALUES (
--   'RED003', 
--   'lona', 
--   'm²', 
--   'Sercodam', 
--   'Lona de protección industrial', 
--   'En calibre No. 40 x 2" (5 cm x 5 cm). Certificación UNE EN – 1263-12004. Confeccionada en SQ. (cuadrada) tejida sin nudo a la luz de malla para mayor resistencia, Trenzada, (8 hilos) Con una resistencia de 800 – 1,000 KG por m2., 100% reciclable, en color azul, tratada con resinas especiales por termo-fijación, con resistencia a la intemperie, rayos UV y a la abrasión, muy baja absorción al agua (85% impermeable), no digerible por algún insecto, 100% inerte, no produce bacterias, no acumula electricidad estática, mantiene su tenacidad en ambientes ácidos y alcalinos, estirada y planchada a lo largo y ancho en vapor y aire seco para evitar su deformación. *Reforzada en todas sus orillas con piola Cal.80. Garantía de fábrica 2 años. Marca Redes & Piolas SERCODAM.',
--   'redes/lona-calibre-40.jpg'
-- ) ON CONFLICT (id_mcr) DO UPDATE SET
--   ficha_tecnica = EXCLUDED.ficha_tecnica,
--   foto = EXCLUDED.foto; 