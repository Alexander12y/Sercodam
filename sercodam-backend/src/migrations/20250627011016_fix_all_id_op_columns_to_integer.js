/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Eliminar todas las foreign keys relacionadas con id_op
  await knex.raw('ALTER TABLE movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv_op');
  await knex.raw('ALTER TABLE herramienta_ordenada DROP CONSTRAINT IF EXISTS herramienta_ordenada_id_op_fkey');
  await knex.raw('ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS orden_produccion_detalle_id_op_fkey');

  // 2. Cambiar id_op en orden_produccion de text a integer
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op DROP DEFAULT');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op TYPE integer USING (id_op::integer)');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET NOT NULL');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET DEFAULT nextval(\'orden_produccion_id_op_seq\')');

  // 3. Cambiar id_op en movimiento_inventario de text a integer
  await knex.raw('ALTER TABLE movimiento_inventario ALTER COLUMN id_op TYPE integer USING (id_op::integer)');

  // 4. Cambiar id_op en herramienta_ordenada de text a integer
  await knex.raw('ALTER TABLE herramienta_ordenada ALTER COLUMN id_op TYPE integer USING (id_op::integer)');

  // 5. Cambiar id_op en orden_produccion_detalle de text a integer
  await knex.raw('ALTER TABLE orden_produccion_detalle ALTER COLUMN id_op TYPE integer USING (id_op::integer)');

  // 6. Restaurar todas las foreign keys
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
  // 1. Eliminar todas las foreign keys
  await knex.raw('ALTER TABLE movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv_op');
  await knex.raw('ALTER TABLE herramienta_ordenada DROP CONSTRAINT IF EXISTS herramienta_ordenada_id_op_fkey');
  await knex.raw('ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS orden_produccion_detalle_id_op_fkey');

  // 2. Cambiar id_op en orden_produccion de integer a text
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op DROP DEFAULT');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op TYPE text');
  await knex.raw('ALTER TABLE orden_produccion ALTER COLUMN id_op SET NOT NULL');

  // 3. Cambiar id_op en movimiento_inventario de integer a text
  await knex.raw('ALTER TABLE movimiento_inventario ALTER COLUMN id_op TYPE text');

  // 4. Cambiar id_op en herramienta_ordenada de integer a text
  await knex.raw('ALTER TABLE herramienta_ordenada ALTER COLUMN id_op TYPE text');

  // 5. Cambiar id_op en orden_produccion_detalle de integer a text
  await knex.raw('ALTER TABLE orden_produccion_detalle ALTER COLUMN id_op TYPE text');

  // 6. Restaurar todas las foreign keys
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
