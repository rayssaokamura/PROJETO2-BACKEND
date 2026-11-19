import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { LancamentoModel } from '../models/lancamento.model.js';

const router = Router();
router.use(autenticar);

function validar({ tipo, descricao, valor, data, categoriaId, fonteDestinoId, parcelas }) {
  const campos = {};
  if (!['entrada', 'saida'].includes(tipo)) campos.tipo = 'Tipo deve ser entrada ou saida.';
  if (typeof descricao !== 'string' || !descricao.trim() || descricao.trim().length > 120) {
    campos.descricao = 'Informe uma descrição de até 120 caracteres.';
  }
  if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) campos.valor = 'Informe um valor maior que zero.';
  if (Number.isFinite(Number(valor)) && Number(valor) > 0
    && Math.abs(Number(valor) * 100 - Math.round(Number(valor) * 100)) > 1e-8) {
    campos.valor = 'Informe um valor com até duas casas decimais.';
  }
  const dataValida = typeof data === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(data)
    && !Number.isNaN(Date.parse(`${data}T00:00:00Z`))
    && new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) === data;
  if (!dataValida) {
    campos.data = 'Informe uma data válida.';
  }
  if (!Number.isInteger(Number(categoriaId)) || Number(categoriaId) < 1) campos.categoriaId = 'Selecione uma categoria válida.';
  if (!Number.isInteger(Number(fonteDestinoId)) || Number(fonteDestinoId) < 1) campos.fonteDestinoId = 'Selecione uma conta ou cartão válido.';
  if (!Number.isInteger(Number(parcelas)) || Number(parcelas) < 1 || Number(parcelas) > 48) {
    campos.parcelas = 'O parcelamento deve ter entre 1 e 48 vezes.';
  }
  if (Number.isFinite(Number(valor)) && Number(valor) > 0 && Math.round(Number(valor) * 100) < Number(parcelas)) {
    campos.parcelas = 'O valor não pode ser dividido em mais parcelas do que centavos.';
  }
  return campos;
}

router.get('/', async (req, res, next) => {
  try {
    return res.json(await LancamentoModel.listarPorUsuario(req.usuarioId));
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', async (req, res, next) => {
  const corpo = {
    ...req.body,
    parcelas: req.body.tipo === 'saida' ? Number(req.body.parcelas || 1) : 1,
  };
  const campos = validar(corpo);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Dados inválidos.', campos });

  try {
    const lancamento = await LancamentoModel.criar({
      usuarioId: req.usuarioId,
      ...corpo,
      descricao: corpo.descricao.trim(),
      valor: Number(corpo.valor),
      categoriaId: Number(corpo.categoriaId),
      fonteDestinoId: Number(corpo.fonteDestinoId),
    });
    if (!lancamento) {
      return res.status(400).json({
        erro: 'Categoria e conta devem pertencer ao usuário e ser compatíveis com o tipo do lançamento.',
        campos: { categoriaId: 'Confira a categoria e a conta ou cartão selecionados.' },
      });
    }
    return res.status(201).json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'Identificador de lançamento inválido.' });

  try {
    if (!(await LancamentoModel.excluir({ id, usuarioId: req.usuarioId }))) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
