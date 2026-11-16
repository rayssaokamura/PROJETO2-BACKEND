import pool from '../config/db.js';

export const CategoriaModel = {
  async listarPorUsuario(usuarioId) {
    const result = await pool.query(
      'SELECT id, nome, tipo FROM categorias WHERE usuario_id = $1 ORDER BY tipo, nome',
      [usuarioId]
    );
    return result.rows;
  },

  async criar({ usuarioId, nome, tipo }) {
    const result = await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo)
       VALUES ($1, $2, $3)
       RETURNING id, nome, tipo`,
      [usuarioId, nome, tipo]
    );
    return result.rows[0];
  },

  async atualizar({ id, usuarioId, nome, tipo }) {
    const result = await pool.query(
      `UPDATE categorias
       SET nome = $1, tipo = $2
       WHERE id = $3 AND usuario_id = $4
       RETURNING id, nome, tipo`,
      [nome, tipo, id, usuarioId]
    );
    return result.rows[0];
  },

  async excluir({ id, usuarioId }) {
    const result = await pool.query(
      'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, usuarioId]
    );
    return result.rowCount > 0;
  }
};