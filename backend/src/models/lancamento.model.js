import pool from '../config/db.js';

const CAMPOS_RETORNO = `
  l.id,
  l.tipo,
  l.descricao,
  l.valor,
  TO_CHAR(l.data, 'YYYY-MM-DD') AS data,
  l.categoria_id AS "categoriaId",
  l.fonte_destino_id AS "fonteDestinoId",
  l.parcela_atual AS "parcelaAtual",
  l.total_parcelas AS parcelas,
  l.grupo_parcelamento AS "grupoParcelamento"
`;

export const LancamentoModel = {
  async listarPorUsuario(usuarioId) {
    const result = await pool.query(
      `SELECT ${CAMPOS_RETORNO}
       FROM lancamentos l
       WHERE l.usuario_id = $1
       ORDER BY l.data DESC, l.id DESC`,
      [usuarioId]
    );
    return result.rows;
  },

  async criar({ usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId, parcelas }) {
    const result = await pool.query(
      `INSERT INTO lancamentos (
         usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, total_parcelas
       )
       SELECT $1, $2, $3, $4, $5, c.id, f.id, $8
       FROM categorias c
       JOIN fontes_destinos f ON f.id = $7 AND f.usuario_id = $1
       WHERE c.id = $6
         AND c.usuario_id = $1
         AND c.tipo = $2
         AND (($2 = 'entrada' AND f.tipo IN ('renda', 'conta'))
           OR ($2 = 'saida' AND f.tipo IN ('conta', 'cartao_credito')))
       RETURNING id, tipo, descricao, valor, TO_CHAR(data, 'YYYY-MM-DD') AS data,
         categoria_id AS "categoriaId", fonte_destino_id AS "fonteDestinoId",
         parcela_atual AS "parcelaAtual", total_parcelas AS parcelas,
         grupo_parcelamento AS "grupoParcelamento"`,
      [usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId, parcelas]
    );
    return result.rows[0] || null;
  },

  async excluir({ id, usuarioId }) {
    const result = await pool.query(
      'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, usuarioId]
    );
    return result.rowCount > 0;
  },

  async obterDadosSaude(usuarioId) {
    const result = await pool.query(
      `SELECT
         l.tipo,
         l.valor,
         TO_CHAR(l.data, 'YYYY-MM-DD') AS data,
         l.total_parcelas AS parcelas,
         f.tipo AS "tipoFonte",
         f.dia_fechamento AS "diaFechamento",
         f.dia_vencimento AS "diaVencimento"
       FROM lancamentos l
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id AND f.usuario_id = l.usuario_id
       WHERE l.usuario_id = $1`,
      [usuarioId]
    );
    return result.rows;
  }
};
