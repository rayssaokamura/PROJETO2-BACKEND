import pool from '../config/db.js';

export const UsuarioModel = {
  async criar({ nome, email, cpf, senhaHash }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resUsuario = await client.query(
        `INSERT INTO usuarios (nome, email, cpf, senha_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nome, email;`,
        [nome, email, cpf, senhaHash]
      );
      const novoUsuario = resUsuario.rows[0];

      await client.query(
        `INSERT INTO categorias (usuario_id, nome, tipo) VALUES
        ($1, 'Salário', 'entrada'),
        ($1, 'Alimentação', 'saida'),
        ($1, 'Moradia', 'saida'),
        ($1, 'Saúde', 'saida'),
        ($1, 'Mobilidade', 'saida'),
        ($1, 'Lazer', 'saida'),
        ($1, 'Educação', 'saida'),
        ($1, 'Outros', 'saida');`,
        [novoUsuario.id]
      );

      await client.query(
        `INSERT INTO fontes_destinos (usuario_id, nome, tipo) 
         VALUES ($1, 'Conta Corrente', 'conta');`,
        [novoUsuario.id]
      );

      await client.query('COMMIT');
      return novoUsuario;
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  },

  async buscarPorEmail(email) {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return result.rows[0];
  },

  async buscarPorId(id) {
    const result = await pool.query(
      'SELECT id, nome, email, cpf, criado_em FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
};