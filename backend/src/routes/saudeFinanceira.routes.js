import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { expandirLancamento } from '../config/financeiro.js';
import { LancamentoModel } from '../models/lancamento.model.js';

const router = Router();
const MESES_HISTORICO = 3;
const MESES_PROJECAO = 6;

function mesISO(data) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

function primeiroDia(mes, deslocamento = 0) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero - 1 + deslocamento, 1));
}

function moedaNumero(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const registros = await LancamentoModel.obterDadosSaude(req.usuarioId);
    const movimentacoes = registros.flatMap(expandirLancamento);
    const hoje = new Date();
    const mesAtual = mesISO(new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), 1)));
    const mesesHistoricos = Array.from({ length: MESES_HISTORICO }, (_, indice) => (
      mesISO(primeiroDia(mesAtual, indice - MESES_HISTORICO))
    ));
    const mesesFuturos = Array.from({ length: MESES_PROJECAO }, (_, indice) => (
      mesISO(primeiroDia(mesAtual, indice))
    ));

    const historico = mesesHistoricos.map((mes) => {
      const itens = movimentacoes.filter((item) => item.mes === mes);
      const entradas = itens.filter((item) => item.tipo === 'entrada').reduce((total, item) => total + item.valor, 0);
      const despesas = itens.filter((item) => item.tipo === 'saida').reduce((total, item) => total + item.valor, 0);
      const despesasCartao = itens.filter((item) => item.tipo === 'saida' && item.cartao).reduce((total, item) => total + item.valor, 0);
      return { mes, entradas: moedaNumero(entradas), despesas: moedaNumero(despesas), despesasCartao: moedaNumero(despesasCartao) };
    });
    const mesesComDados = historico.filter((mes) => mes.entradas > 0 || mes.despesas > 0);
    const totalEntradas = historico.reduce((total, mes) => total + mes.entradas, 0);
    const totalDespesas = historico.reduce((total, mes) => total + mes.despesas, 0);
    const totalDespesasCartao = historico.reduce((total, mes) => total + mes.despesasCartao, 0);
    const saldoHistorico = moedaNumero(totalEntradas - totalDespesas);
    const taxaPoupanca = totalEntradas > 0 ? moedaNumero((saldoHistorico / totalEntradas) * 100) : null;

    const faturasProximosTresMeses = mesesFuturos.slice(0, 3).map((mes) => ({
      mes,
      valor: moedaNumero(movimentacoes
        .filter((item) => item.mes === mes && item.cartao)
        .reduce((total, item) => total + item.valor, 0)),
    }));
    const totalFaturas = moedaNumero(faturasProximosTresMeses.reduce((total, item) => total + item.valor, 0));
    const rendaMediaMensal = moedaNumero(totalEntradas / MESES_HISTORICO);
    const comprometimentoCartoes = rendaMediaMensal > 0
      ? moedaNumero((totalFaturas / rendaMediaMensal) * 100)
      : null;
    const mediaSaldoMensal = moedaNumero((totalEntradas - totalDespesas) / MESES_HISTORICO);
    const mediaDespesasCartao = moedaNumero(totalDespesasCartao / MESES_HISTORICO);

    const parcelasFuturas = mesesFuturos.map((mes) => {
      const itens = movimentacoes.filter((item) => item.mes === mes && item.cartao);
      return {
        mes,
        valor: moedaNumero(itens.reduce((total, item) => total + item.valor, 0)),
        quantidade: itens.length,
      };
    });

    const projecao = mesesFuturos.map((mes) => {
      const parcelasConhecidas = parcelasFuturas.find((item) => item.mes === mes).valor;
      return {
        mes,
        saldoProjetado: mesesComDados.length
          ? moedaNumero(mediaSaldoMensal + mediaDespesasCartao - parcelasConhecidas)
          : null,
        parcelasConhecidas,
      };
    });

    const dicas = [];
    if (taxaPoupanca == null) {
      dicas.push('Ainda não há entradas registradas nos últimos três meses para calcular sua taxa de poupança.');
    } else if (taxaPoupanca < 10) {
      dicas.push(`Sua taxa de poupança foi ${taxaPoupanca.toLocaleString('pt-BR')}%. Uma referência educativa é tentar reservar 10% da renda, se isso couber na sua realidade.`);
    } else {
      dicas.push(`Sua taxa de poupança foi ${taxaPoupanca.toLocaleString('pt-BR')}%, acima da referência educativa de 10%.`);
    }
    if (comprometimentoCartoes == null) {
      dicas.push('Registre entradas para comparar as faturas previstas com sua renda média.');
    } else if (comprometimentoCartoes > 30) {
      dicas.push(`As faturas dos próximos três meses equivalem a ${comprometimentoCartoes.toLocaleString('pt-BR')}% da renda média mensal; acompanhe os vencimentos e avalie seus gastos futuros.`);
    } else {
      dicas.push(`As faturas dos próximos três meses equivalem a ${comprometimentoCartoes.toLocaleString('pt-BR')}% da renda média mensal.`);
    }
    if (projecao.some((mes) => mes.saldoProjetado != null && mes.saldoProjetado < 0)) {
      dicas.push('A projeção indica saldo mensal negativo em pelo menos um dos próximos seis meses. Revise as despesas e parcelas previstas.');
    }

    return res.json({
      periodoHistorico: mesesHistoricos,
      taxaPoupanca: {
        percentual: taxaPoupanca,
        entradas: moedaNumero(totalEntradas),
        despesas: moedaNumero(totalDespesas),
        saldo: saldoHistorico,
        mesesConsiderados: MESES_HISTORICO,
        dica: dicas[0],
      },
      comprometimentoCartoes: {
        percentual: comprometimentoCartoes,
        rendaMediaMensal,
        totalFaturasProximosTresMeses: totalFaturas,
        faturas: faturasProximosTresMeses,
        dica: dicas.find((dica) => dica.startsWith('As faturas') || dica.startsWith('Registre entradas')),
      },
      parcelasFuturas,
      projecao: {
        meses: projecao,
        mesesHistoricosComDados: mesesComDados.length,
        explicacao: 'A projeção usa o saldo médio dos últimos três meses e substitui a média histórica de despesas no cartão pelas parcelas já registradas. Novas compras futuras no cartão não são estimadas.',
      },
      dicas,
      aviso: 'Indicadores educativos baseados nos lançamentos registrados. Não constituem recomendação financeira profissional.',
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;
