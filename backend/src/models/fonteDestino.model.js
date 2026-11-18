import pool from '../config/db.js';

export const FonteDestinoModel = {
  async listarPorUsuario(usuarioId) {
    const result = await pool.query(
      `SELECT id, nome, tipo, dia_fechamento, dia_vencimento, limite
       FROM fontes_destinos
       WHERE usuario_id = $1
       ORDER BY tipo, nome`,
      [usuarioId]
    );
    return result.rows;
  },

  async criar({ usuarioId, nome, tipo, diaFechamento, diaVencimento, limite }) {
    const result = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, tipo, dia_fechamento, dia_vencimento, limite`,
      [
        usuarioId,
        nome,
        tipo,
        tipo === 'cartao_credito' ? diaFechamento : null,
        tipo === 'cartao_credito' ? diaVencimento : null,
        tipo === 'cartao_credito' ? limite : null
      ]
    );
    return result.rows[0];
  },

  async atualizar({ id, usuarioId, nome, tipo, diaFechamento, diaVencimento, limite }) {
    const result = await pool.query(
      `UPDATE fontes_destinos
       SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5
       WHERE id = $6 AND usuario_id = $7
       RETURNING id, nome, tipo, dia_fechamento, dia_vencimento, limite`,
      [
        nome,
        tipo,
        tipo === 'cartao_credito' ? diaFechamento : null,
        tipo === 'cartao_credito' ? diaVencimento : null,
        tipo === 'cartao_credito' ? limite : null,
        id,
        usuarioId
      ]
    );
    return result.rows[0];
  },

  async excluir({ id, usuarioId }) {
    const result = await pool.query(
      'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, usuarioId]
    );
    return result.rowCount > 0;
  }
};