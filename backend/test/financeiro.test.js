import assert from 'node:assert/strict';
import test from 'node:test';
import { expandirLancamento } from '../src/config/financeiro.js';

test('cartão joga compra após o fechamento para a fatura seguinte', () => {
  const parcelas = expandirLancamento({
    tipo: 'saida',
    valor: '120.00',
    data: '2026-01-21',
    parcelas: 3,
    tipoFonte: 'cartao_credito',
    diaFechamento: 20,
    diaVencimento: 15,
  });

  assert.deepEqual(parcelas.map(({ data, valor }) => ({ data, valor })), [
    { data: '2026-03-15', valor: 40 },
    { data: '2026-04-15', valor: 40 },
    { data: '2026-05-15', valor: 40 },
  ]);
});

test('cartão inclui compra no dia do fechamento na fatura seguinte e distribui centavos', () => {
  const parcelas = expandirLancamento({
    tipo: 'saida',
    valor: '10.00',
    data: '2026-01-20',
    parcelas: 3,
    tipoFonte: 'cartao_credito',
    diaFechamento: 20,
    diaVencimento: 31,
  });

  assert.deepEqual(parcelas.map(({ data, valor }) => ({ data, valor })), [
    { data: '2026-02-28', valor: 3.33 },
    { data: '2026-03-31', valor: 3.33 },
    { data: '2026-04-30', valor: 3.34 },
  ]);
});

test('entrada ou despesa fora do cartão é considerada na data do lançamento', () => {
  const [movimentacao] = expandirLancamento({
    tipo: 'entrada',
    valor: '2500.50',
    data: '2026-11-18',
    parcelas: 1,
    tipoFonte: 'renda',
  });

  assert.deepEqual(movimentacao, {
    data: '2026-11-18',
    mes: '2026-11',
    tipo: 'entrada',
    valor: 2500.5,
    cartao: false,
  });
});
