-- Agregar foreign key constraint para id_usuario en ordenes_draft
ALTER TABLE ordenes_draft 
ADD CONSTRAINT ordenes_draft_id_usuario_fkey 
FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE;

-- Verificar que se agregó correctamente
\d ordenes_draft; 