/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Eliminar foreign keys
  await knex.raw('ALTER TABLE movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv_op');
  await knex.raw('ALTER TABLE herramienta_ordenada DROP CONSTRAINT IF EXISTS herramienta_ordenada_id_op_fkey');
  await knex.raw('ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS orden_produccion_detalle_id_op_fkey');

  // 2. Cambiar id_op en orden_produccion a integer (manteniendo secuencia)
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op DROP DEFAULT');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op TYPE integer USING (id_op::integer)');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET NOT NULL');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET DEFAULT nextval(\'orden_produccion_id_op_seq\')');

  // 3. Cambiar columnas relacionadas a integer
  await knex.raw('ALTER TABLE movimiento_inventario ALTER COLUMN id_op TYPE integer USING (id_op::integer)');
  await knex.raw('ALTER TABLE herramienta_ordenada ALTER COLUMN id_op TYPE integer USING (id_op::integer)');
  await knex.raw('ALTER TABLE orden_produccion_detalle ALTER COLUMN id_op TYPE integer USING (id_op::integer)');

  // 4. Restaurar foreign keys
  await knex.raw(`ALTER TABLE movimiento_inventario
    ADD CONSTRAINT fk_mov_inv_op
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)
    ON UPDATE CASCADE ON DELETE SET NULL`);
  await knex.raw(`ALTER TABLE herramienta_ordenada
    ADD CONSTRAINT herramienta_ordenada_id_op_fkey
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)`);
  await knex.raw(`ALTER TABLE orden_produccion_detalle
    ADD CONSTRAINT orden_produccion_detalle_id_op_fkey
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)
    ON DELETE CASCADE`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // 1. Eliminar foreign keys
  await knex.raw('ALTER TABLE movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv_op');
  await knex.raw('ALTER TABLE herramienta_ordenada DROP CONSTRAINT IF EXISTS herramienta_ordenada_id_op_fkey');
  await knex.raw('ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS orden_produccion_detalle_id_op_fkey');

  // 2. Cambiar id_op en orden_produccion a text
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op DROP DEFAULT');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op TYPE text');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET NOT NULL');

  // 3. Cambiar columnas relacionadas a text
  await knex.raw('ALTER TABLE movimiento_inventario ALTER COLUMN id_op TYPE text');
  await knex.raw('ALTER TABLE herramienta_ordenada ALTER COLUMN id_op TYPE text');
  await knex.raw('ALTER TABLE orden_produccion_detalle ALTER COLUMN id_op TYPE text');

  // 4. Restaurar foreign keys
  await knex.raw(`ALTER TABLE movimiento_inventario
    ADD CONSTRAINT fk_mov_inv_op
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)
    ON UPDATE CASCADE ON DELETE SET NULL`);
  await knex.raw(`ALTER TABLE herramienta_ordenada
    ADD CONSTRAINT herramienta_ordenada_id_op_fkey
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)`);
  await knex.raw(`ALTER TABLE orden_produccion_detalle
    ADD CONSTRAINT orden_produccion_detalle_id_op_fkey
    FOREIGN KEY (id_op) REFERENCES orden_produccion(id_op)
    ON DELETE CASCADE`);
}; 