import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { FonteDestinoModel } from '../models/fonteDestino.model.js';

const router = Router();
router.use(autenticar);

function validar({ nome, tipo, diaFechamento, diaVencimento, limite }) {
  const campos = {};
  if (!nome || !nome.trim()) campos.nome = 'Nome é obrigatório.';
  if (!['renda', 'conta', 'cartao_credito'].includes(tipo)) campos.tipo = 'Tipo inválido.';
  if (tipo === 'cartao_credito') {
    const dia = (d) => Number.isInteger(Number(d)) && d !== '' && d >= 1 && d <= 31;
    if (!dia(diaFechamento)) campos.diaFechamento = 'Informe um dia de 1 a 31.';
    if (!dia(diaVencimento)) campos.diaVencimento = 'Informe um dia de 1 a 31.';
    if (limite === '' || limite == null || Number(limite) < 0 || Number.isNaN(Number(limite))) campos.limite = 'Informe um limite válido.';
  }
  return campos;
}

const duplicada = (res) => res.status(409).json({
  erro: 'Nome duplicado.', campos: { nome: 'Você já possui uma conta com este nome.' }
});

router.get('/', async (req, res, next) => {
  try { res.json(await FonteDestinoModel.listarPorUsuario(req.usuarioId)); } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const campos = validar(req.body);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Dados inválidos.', campos });
  try {
    const item = await FonteDestinoModel.criar({ usuarioId: req.usuarioId, ...req.body, nome: req.body.nome.trim() });
    res.status(201).json(item);
  } catch (e) { e.code === '23505' ? duplicada(res) : next(e); }
});

router.put('/:id', async (req, res, next) => {
  const campos = validar(req.body);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Dados inválidos.', campos });
  try {
    const item = await FonteDestinoModel.atualizar({ id: req.params.id, usuarioId: req.usuarioId, ...req.body, nome: req.body.nome.trim() });
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });
    res.json(item);
  } catch (e) { e.code === '23505' ? duplicada(res) : next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await FonteDestinoModel.excluir({ id: req.params.id, usuarioId: req.usuarioId }))) {
      return res.status(404).json({ erro: 'Item não encontrado.' });
    }
    res.status(204).send();
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ erro: 'Não é possível excluir: existem lançamentos vinculados.' });
    next(e);
  }
});

export default router;
