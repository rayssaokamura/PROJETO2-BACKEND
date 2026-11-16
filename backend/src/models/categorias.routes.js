import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { CategoriaModel } from '../models/categoria.model.js';

const router = Router();
router.use(autenticar); // Protege todas as rotas deste arquivo

router.get('/', async (req, res, next) => {
  try {
    const categorias = await CategoriaModel.listarPorUsuario(req.usuarioId);
    return res.json(categorias);
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', async (req, res, next) => {
  const { nome, tipo } = req.body;
  const campos = {};

  if (!nome || !nome.trim()) campos.nome = 'Nome é obrigatório.';
  if (!['entrada', 'saida'].includes(tipo)) campos.tipo = 'Tipo deve ser entrada ou saida.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const categoria = await CategoriaModel.criar({
      usuarioId: req.usuarioId,
      nome: nome.trim(),
      tipo
    });
    return res.status(201).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({
        erro: 'Categoria duplicada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' }
      });
    }
    return next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { nome, tipo } = req.body;
  const campos = {};

  if (!nome || !nome.trim()) campos.nome = 'Nome é obrigatório.';
  if (!['entrada', 'saida'].includes(tipo)) campos.tipo = 'Tipo deve ser entrada ou saida.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const categoria = await CategoriaModel.atualizar({
      id,
      usuarioId: req.usuarioId,
      nome: nome.trim(),
      tipo
    });

    if (!categoria) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }

    return res.json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({
        erro: 'Categoria duplicada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' }
      });
    }
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const excluido = await CategoriaModel.excluir({
      id: req.params.id,
      usuarioId: req.usuarioId
    });

    if (!excluido) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }

    return res.status(204).send();
  } catch (erro) {
    // Código 23503 no PostgreSQL: foreign_key_violation (possui lançamentos associados)
    if (erro.code === '23503') {
      return res.status(409).json({
        erro: 'Não é possível excluir esta categoria pois existem lançamentos vinculados a ela.'
      });
    }
    return next(erro);
  }
});

export default router;