import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const app = express();

// Middlewares globais (exigidos no enunciado)
app.use(cors()); 
app.use(express.json());

// Rota de teste para ver se o servidor e o banco estão vivos
app.get('/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS hora_atual');
    res.json({ mensagem: 'Pong! Banco conectado.', banco: result.rows[0].hora_atual });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Falha ao conectar no banco de dados.' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});