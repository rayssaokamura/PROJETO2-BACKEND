function mesISO(data) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

function primeiroDia(mes, deslocamento = 0) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero - 1 + deslocamento, 1));
}

function dataVencimento(dataBase, dia) {
  const ultimoDia = new Date(Date.UTC(dataBase.getUTCFullYear(), dataBase.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(dataBase.getUTCFullYear(), dataBase.getUTCMonth(), Math.min(Number(dia), ultimoDia)));
}

function dataISO(data) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
}

export function expandirLancamento(lancamento) {
  const data = new Date(`${lancamento.data}T00:00:00Z`);
  const quantidade = Number(lancamento.parcelas) || 1;
  const valorCentavos = Math.round(Number(lancamento.valor) * 100);

  if (lancamento.tipo !== 'saida' || lancamento.tipoFonte !== 'cartao_credito') {
    return [{
      data: dataISO(data),
      mes: mesISO(data),
      tipo: lancamento.tipo,
      valor: valorCentavos / 100,
      cartao: false,
    }];
  }

  const mesesAteVencimento = data.getUTCDate() > Number(lancamento.diaFechamento) ? 2 : 1;
  const primeiroVencimento = primeiroDia(mesISO(data), mesesAteVencimento);
  const centavosBase = Math.floor(valorCentavos / quantidade);
  const centavosRestantes = valorCentavos - centavosBase * quantidade;

  return Array.from({ length: quantidade }, (_, indice) => {
    const vencimento = dataVencimento(
      primeiroDia(mesISO(primeiroVencimento), indice),
      lancamento.diaVencimento
    );
    return {
      data: dataISO(vencimento),
      mes: mesISO(vencimento),
      tipo: 'saida',
      valor: (centavosBase + (indice === quantidade - 1 ? centavosRestantes : 0)) / 100,
      cartao: true,
    };
  });
}
