import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Apenas para checar se a conexão inicial funcionou
pool.on('connect', () => {
  console.log('Conexão com o PostgreSQL bem-sucedida!');
});

export default pool;