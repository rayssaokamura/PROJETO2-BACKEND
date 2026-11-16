import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import fontesDestinosRoutes from './routes/fontesDestinos.routes.js';
import { tratarErros } from './middlewares/erro.middleware.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

app.get('/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS hora_atual');
    res.json({ mensagem: 'Pong! Banco conectado.', banco: result.rows[0].hora_atual });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao conectar no banco de dados.' });
  }
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);

// Middleware centralizado de erros (sempre após as rotas)
app.use(tratarErros);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});