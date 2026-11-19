import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alerta, Campo, moeda } from '../components.jsx';

const hoje = new Date();
const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
const FORMULARIO_VAZIO = {
  descricao: '',
  tipo: 'saida',
  valor: '',
  data: dataHoje,
  categoriaId: '',
  fonteDestinoId: '',
  parcelas: '1',
};

function adicionarMes(data, quantidade) {
  return new Date(data.getFullYear(), data.getMonth() + quantidade, 1);
}

function mesDaData(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function dataVencimento(dataBase, dia) {
  const ultimoDia = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0).getDate();
  return new Date(dataBase.getFullYear(), dataBase.getMonth(), Math.min(Number(dia), ultimoDia));
}

function parcelasDoLancamento(lancamento, cartao) {
  const data = new Date(`${lancamento.data}T00:00:00`);
  const quantidade = Number(lancamento.parcelas) || 1;
  const valorCentavos = Math.round(Number(lancamento.valor) * 100);

  if (lancamento.tipo !== 'saida' || cartao?.tipo !== 'cartao_credito') {
    return [{
      ...lancamento,
      valorParcela: valorCentavos / 100,
      dataReferencia: data,
      numeroParcela: 1,
      totalParcelas: 1,
    }];
  }

  const fechamento = Number(cartao.dia_fechamento);
  const mesesAteVencimento = data.getDate() > fechamento ? 2 : 1;
  const primeiroVencimento = adicionarMes(data, mesesAteVencimento);
  const centavosBase = Math.floor(valorCentavos / quantidade);
  const centavosRestantes = valorCentavos - centavosBase * quantidade;

  return Array.from({ length: quantidade }, (_, indice) => ({
    ...lancamento,
    valorParcela: (centavosBase + (indice === quantidade - 1 ? centavosRestantes : 0)) / 100,
    dataReferencia: dataVencimento(adicionarMes(primeiroVencimento, indice), cartao.dia_vencimento),
    numeroParcela: indice + 1,
    totalParcelas: quantidade,
  }));
}

function nomeMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, numero - 1, 1));
}

export default function Planejamento() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const identificadorCru = usuario.id || usuario.email || 'local';
  const identificadorUsuario = encodeURIComponent(identificadorCru);
  const chaveOrcamento = `financas:orcamentos:${identificadorUsuario}`;
  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [orcamentos, setOrcamentos] = useState({});
  const [mes, setMes] = useState(mesAtual);
  const [form, setForm] = useState(FORMULARIO_VAZIO);
  const [erro, setErro] = useState('');
  const [erroLocal, setErroLocal] = useState('');
  const [prontoParaSalvar, setProntoParaSalvar] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([api('/categorias'), api('/fontes-destinos'), api('/lancamentos')])
      .then(async ([listaCategorias, listaFontes, listaLancamentos]) => {
        if (!ativo) return;
        setCategorias(listaCategorias);
        setFontes(listaFontes);
        setLancamentos(listaLancamentos);
        setProntoParaSalvar(true);

        const chavesLegadas = [
          `financas:lancamentos:${identificadorCru}`,
          `financas:lancamentos:${identificadorUsuario}`,
        ];
        for (const chave of new Set(chavesLegadas)) {
          let pendentes;
          try {
            pendentes = JSON.parse(localStorage.getItem(chave) || '[]');
            if (!Array.isArray(pendentes)) throw new Error('Formato inválido.');
          } catch {
            setErroLocal('Há lançamentos antigos neste navegador que não puderam ser importados automaticamente.');
            continue;
          }

          while (pendentes.length && ativo) {
            const antigo = pendentes[0];
            try {
              const importado = await api('/lancamentos', {
                method: 'POST',
                body: {
                  tipo: antigo.tipo,
                  descricao: antigo.descricao,
                  valor: Number(antigo.valor),
                  data: antigo.data,
                  categoriaId: Number(antigo.categoriaId),
                  fonteDestinoId: Number(antigo.fonteDestinoId),
                  parcelas: Number(antigo.parcelas) || 1,
                },
              });
              pendentes = pendentes.slice(1);
              if (pendentes.length) localStorage.setItem(chave, JSON.stringify(pendentes));
              else localStorage.removeItem(chave);
              setLancamentos((atuais) => [importado, ...atuais]);
            } catch (e) {
              setErroLocal(`Não foi possível importar ${pendentes.length} lançamento(s) antigo(s): ${e.mensagem || 'verifique as categorias e contas vinculadas.'}`);
              break;
            }
          }
        }
      })
      .catch((e) => {
        if (ativo) setErro(e.mensagem || 'Não foi possível carregar categorias e contas.');
      });

    try {
      const salvo = localStorage.getItem(chaveOrcamento);
      setOrcamentos(salvo ? JSON.parse(salvo) : {});
    } catch {
      setErroLocal('Não foi possível ler as metas salvas neste navegador.');
    }

    return () => { ativo = false; };
  }, []);

  const cartoes = fontes.filter((fonte) => fonte.tipo === 'cartao_credito');
  const fontesDisponiveis = fontes.filter((fonte) => (
    form.tipo === 'entrada'
      ? fonte.tipo === 'renda' || fonte.tipo === 'conta'
      : fonte.tipo === 'conta' || fonte.tipo === 'cartao_credito'
  ));
  const categoriasDisponiveis = categorias.filter((categoria) => categoria.tipo === form.tipo);
  const parcelasSelecionadas = Number(form.parcelas) || 1;

  useEffect(() => {
    const primeiraCategoria = categoriasDisponiveis[0]?.id || '';
    const primeiraFonte = fontesDisponiveis[0]?.id || '';
    setForm((atual) => ({
      ...atual,
      categoriaId: categoriasDisponiveis.some((item) => String(item.id) === String(atual.categoriaId))
        ? atual.categoriaId : primeiraCategoria,
      fonteDestinoId: fontesDisponiveis.some((item) => String(item.id) === String(atual.fonteDestinoId))
        ? atual.fonteDestinoId : primeiraFonte,
      parcelas: form.tipo === 'saida' && fontesDisponiveis.find((item) => String(item.id) === String(atual.fonteDestinoId))?.tipo === 'cartao_credito'
        ? atual.parcelas : '1',
    }));
  }, [categorias, fontes, form.tipo]);

  const linhasDoMes = useMemo(() => lancamentos.flatMap((lancamento) => {
    const fonte = fontes.find((item) => String(item.id) === String(lancamento.fonteDestinoId));
    return parcelasDoLancamento(lancamento, fonte)
      .filter((parcela) => mesDaData(parcela.dataReferencia) === mes);
  }), [lancamentos, fontes, mes]);

  const entradas = linhasDoMes
    .filter((linha) => linha.tipo === 'entrada')
    .reduce((total, linha) => total + linha.valorParcela, 0);
  const saidas = linhasDoMes
    .filter((linha) => linha.tipo === 'saida')
    .reduce((total, linha) => total + linha.valorParcela, 0);
  const saldo = entradas - saidas;
  const orcamento = Number(orcamentos[mes]) || 0;
  const percentualOrcamento = orcamento ? Math.min((saidas / orcamento) * 100, 100) : 0;
  const faturas = cartoes.map((cartao) => {
    const parcelas = linhasDoMes.filter((linha) => (
      linha.tipo === 'saida' && String(linha.fonteDestinoId) === String(cartao.id)
    ));
    return {
      cartao,
      total: parcelas.reduce((total, linha) => total + linha.valorParcela, 0),
      quantidade: parcelas.length,
    };
  });
  const porCategoria = linhasDoMes
    .filter((linha) => linha.tipo === 'saida')
    .reduce((grupos, linha) => {
      const id = String(linha.categoriaId);
      grupos[id] = (grupos[id] || 0) + linha.valorParcela;
      return grupos;
    }, {});
  const maiorCategoria = Math.max(...Object.values(porCategoria), 0);

  const atualizarForm = (campo) => (evento) => {
    const valor = evento.target.value;
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === 'tipo' ? { categoriaId: '', fonteDestinoId: '', parcelas: '1' } : {}),
      ...(campo === 'fonteDestinoId' && fontes.find((item) => String(item.id) === String(valor))?.tipo !== 'cartao_credito'
        ? { parcelas: '1' } : {}),
    }));
    setErro('');
  };

  const salvarLancamento = async (evento) => {
    evento.preventDefault();
    setErro('');
    if (!form.descricao.trim() || !form.valor || Number(form.valor) <= 0 || !form.data || !form.categoriaId || !form.fonteDestinoId) {
      setErro('Preencha a descrição, o valor, a data, a categoria e a conta ou cartão.');
      return;
    }
    if (!Number.isInteger(parcelasSelecionadas) || parcelasSelecionadas < 1 || parcelasSelecionadas > 48) {
      setErro('O parcelamento deve ter entre 1 e 48 vezes.');
      return;
    }
    if (Math.round(Number(form.valor) * 100) < parcelasSelecionadas) {
      setErro('O valor não pode ser dividido em mais parcelas do que centavos.');
      return;
    }

    try {
      const novo = await api('/lancamentos', {
        method: 'POST',
        body: {
          ...form,
          descricao: form.descricao.trim(),
          valor: Number(form.valor),
          categoriaId: Number(form.categoriaId),
          fonteDestinoId: Number(form.fonteDestinoId),
          parcelas: form.tipo === 'saida' ? parcelasSelecionadas : 1,
        },
      });
      setLancamentos((atuais) => [novo, ...atuais]);
      setForm({
        ...FORMULARIO_VAZIO,
        data: dataHoje,
        categoriaId: categoriasDisponiveis[0]?.id || '',
        fonteDestinoId: fontesDisponiveis[0]?.id || '',
      });
    } catch (e) {
      setErro(e.mensagem || 'Não foi possível salvar o lançamento.');
    }
  };

  const excluirLancamento = async (id) => {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await api(`/lancamentos/${id}`, { method: 'DELETE' });
      setLancamentos((atuais) => atuais.filter((item) => item.id !== id));
    } catch (e) {
      setErro(e.mensagem || 'Não foi possível excluir o lançamento.');
    }
  };

  const salvarOrcamento = (evento) => {
    evento.preventDefault();
    const valor = evento.currentTarget.elements.orcamento.value;
    const atualizados = { ...orcamentos, [mes]: Number(valor) || 0 };
    try {
      localStorage.setItem(chaveOrcamento, JSON.stringify(atualizados));
      setOrcamentos(atualizados);
      setErroLocal('');
    } catch {
      setErroLocal('Não foi possível salvar o orçamento neste navegador.');
    }
  };

  return (
    <div className="planejamento">
      <header className="painel-cabecalho">
        <div>
          <span className="sobretitulo">SEU DINHEIRO, SOB CONTROLE</span>
          <h1>Planejamento financeiro</h1>
          <p>Organize o mês e acompanhe suas faturas de cartão.</p>
        </div>
        <label className="seletor-mes">
          <span>Mês do planejamento</span>
          <input type="month" value={mes} onChange={(evento) => setMes(evento.target.value)} />
        </label>
      </header>

      <Alerta msg={erro} />
      <Alerta msg={erroLocal} />

      <section className="resumo-financeiro" aria-label="Resumo do mês">
        <article className="resumo-card">
          <span>Entradas previstas</span>
          <strong className="valor-entrada">{moeda(entradas)}</strong>
          <small>no mês selecionado</small>
        </article>
        <article className="resumo-card">
          <span>Despesas previstas</span>
          <strong>{moeda(saidas)}</strong>
          <small>inclui parcelas com vencimento neste mês</small>
        </article>
        <article className={`resumo-card ${saldo < 0 ? 'resumo-negativo' : ''}`}>
          <span>Saldo projetado</span>
          <strong>{moeda(saldo)}</strong>
          <small>entradas menos despesas previstas</small>
        </article>
      </section>

      <section className="cartao orcamento-card">
        <div className="orcamento-topo">
          <div>
            <span className="sobretitulo">LIMITE DE GASTOS</span>
            <h2>Orçamento de {nomeMes(mes)}</h2>
          </div>
          <form className="orcamento-form" onSubmit={salvarOrcamento}>
            <Campo
              label="Meta mensal (R$)"
              name="orcamento"
              type="number"
              min="0"
              step="0.01"
              defaultValue={orcamento || ''}
              key={mes + orcamento}
              placeholder="Ex.: 2500"
            />
            <button className="btn">Salvar meta</button>
          </form>
        </div>
        {orcamento > 0 ? (
          <>
            <div className="barra-progresso" role="progressbar" aria-valuenow={Math.round(percentualOrcamento)} aria-valuemin="0" aria-valuemax="100">
              <span className={saidas > orcamento ? 'barra-estourada' : ''} style={{ width: `${percentualOrcamento}%` }} />
            </div>
            <div className="orcamento-rodape">
              <span>{moeda(saidas)} gastos de {moeda(orcamento)}</span>
              <strong className={saidas > orcamento ? 'texto-alerta' : ''}>
                {saidas > orcamento ? `Excedeu ${moeda(saidas - orcamento)}` : `Restam ${moeda(orcamento - saidas)}`}
              </strong>
            </div>
          </>
        ) : <p className="texto-secundario">Defina uma meta para acompanhar seus gastos do mês.</p>}
      </section>

      <section className="secao-planejamento">
        <div className="secao-titulo">
          <div>
            <span className="sobretitulo">CARTÕES</span>
            <h2>Faturas previstas</h2>
          </div>
          <Link to="/fontes">Gerenciar cartões</Link>
        </div>
        {cartoes.length ? (
          <div className="grade-faturas">
            {faturas.map(({ cartao, total, quantidade }) => {
              const limite = Number(cartao.limite) || 0;
              const percentual = limite ? Math.min((total / limite) * 100, 100) : 0;
              return (
                <article className="fatura-card" key={cartao.id}>
                  <div className="fatura-icone" aria-hidden="true">▰</div>
                  <div className="fatura-info">
                    <span className="texto-secundario">Fatura do mês</span>
                    <h3>{cartao.nome}</h3>
                    <strong>{moeda(total)}</strong>
                    <small>Vencimento dia {cartao.dia_vencimento} · {quantidade} {quantidade === 1 ? 'parcela' : 'parcelas'}</small>
                    {limite > 0 && (
                      <>
                        <div className="barra-progresso barra-fatura" role="progressbar" aria-valuenow={Math.round(percentual)} aria-valuemin="0" aria-valuemax="100">
                          <span style={{ width: `${percentual}%` }} />
                        </div>
                        <small>{percentual.toFixed(0)}% do limite em parcelas com vencimento neste mês</small>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="cartao estado-vazio">
            <p>Cadastre um cartão para acompanhar suas faturas e parcelamentos.</p>
            <Link className="btn" to="/fontes">Adicionar cartão</Link>
          </div>
        )}
      </section>

      <div className="grade-planejamento">
        <section className="cartao formulario-lancamento">
          <span className="sobretitulo">NOVO REGISTRO</span>
          <h2>Adicionar lançamento</h2>
          <form onSubmit={salvarLancamento}>
            <div className="linha">
              <Campo as="select" label="Tipo" value={form.tipo} onChange={atualizarForm('tipo')}>
                <option value="saida">Despesa</option>
                <option value="entrada">Entrada</option>
              </Campo>
              <Campo label="Descrição" value={form.descricao} onChange={atualizarForm('descricao')} maxLength="120" placeholder="Ex.: Mercado" />
            </div>
            <div className="linha">
              <Campo label="Valor total (R$)" type="number" min="0.01" step="0.01" value={form.valor} onChange={atualizarForm('valor')} placeholder="0,00" />
              <Campo label={form.tipo === 'saida' && fontes.find((item) => String(item.id) === String(form.fonteDestinoId))?.tipo === 'cartao_credito' ? 'Data da compra' : 'Data'} type="date" value={form.data} onChange={atualizarForm('data')} />
            </div>
            <div className="linha">
              <Campo as="select" label="Categoria" value={form.categoriaId} onChange={atualizarForm('categoriaId')}>
                <option value="">Selecione</option>
                {categoriasDisponiveis.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
              </Campo>
              <Campo as="select" label={form.tipo === 'entrada' ? 'Conta ou renda' : 'Conta ou cartão'} value={form.fonteDestinoId} onChange={atualizarForm('fonteDestinoId')}>
                <option value="">Selecione</option>
                {fontesDisponiveis.map((fonte) => <option key={fonte.id} value={fonte.id}>{fonte.nome}</option>)}
              </Campo>
            </div>
            {form.tipo === 'saida' && fontes.find((item) => String(item.id) === String(form.fonteDestinoId))?.tipo === 'cartao_credito' && (
              <Campo label="Parcelas" as="select" value={form.parcelas} onChange={atualizarForm('parcelas')}>
                {Array.from({ length: 48 }, (_, indice) => (
                  <option key={indice + 1} value={indice + 1}>{indice + 1}x{indice ? ` de ${moeda(Number(form.valor || 0) / (indice + 1))}` : ' à vista'}</option>
                ))}
              </Campo>
            )}
            {erro && <p className="erro" role="alert">{erro}</p>}
            {!categoriasDisponiveis.length && <p className="texto-secundario">Cadastre uma categoria de {form.tipo === 'saida' ? 'despesa' : 'entrada'} para continuar.</p>}
            {!fontesDisponiveis.length && <p className="texto-secundario">Cadastre uma conta ou cartão para continuar.</p>}
            <button className="btn" disabled={!prontoParaSalvar}>Adicionar ao planejamento</button>
          </form>
        </section>

        <section className="cartao categorias-gastos">
          <span className="sobretitulo">PARA ONDE VAI O DINHEIRO</span>
          <h2>Despesas por categoria</h2>
          {Object.keys(porCategoria).length ? (
            <ul className="lista-categorias">
              {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([id, total]) => {
                const categoria = categorias.find((item) => String(item.id) === id);
                return (
                  <li key={id}>
                    <div className="categoria-linha">
                      <span>{categoria?.nome || 'Categoria removida'}</span>
                      <strong>{moeda(total)}</strong>
                    </div>
                    <div className="barra-progresso"><span style={{ width: `${maiorCategoria ? (total / maiorCategoria) * 100 : 0}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="texto-secundario">Suas despesas aparecerão aqui.</p>}
        </section>
      </div>

      <section className="cartao lancamentos-mes">
        <div className="secao-titulo">
          <div>
            <span className="sobretitulo">ACOMPANHAMENTO</span>
            <h2>Movimentações de {nomeMes(mes)}</h2>
          </div>
          <span className="contador-lancamentos">{linhasDoMes.length} {linhasDoMes.length === 1 ? 'item' : 'itens'}</span>
        </div>
        {linhasDoMes.length ? (
          <div className="tabela-rolagem">
            <table className="tabela-lancamentos">
              <thead><tr><th>Descrição</th><th>Categoria</th><th>Conta / cartão</th><th>Data</th><th>Valor</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {linhasDoMes
                  .sort((a, b) => a.dataReferencia - b.dataReferencia)
                  .map((linha) => {
                    const cartao = fontes.find((item) => String(item.id) === String(linha.fonteDestinoId))?.tipo === 'cartao_credito';
                    return (
                      <tr key={`${linha.id}-${linha.numeroParcela}`}>
                        <td>{linha.descricao}{cartao && linha.totalParcelas > 1 && <small className="sub-lancamento">Parcela {linha.numeroParcela}/{linha.totalParcelas}</small>}</td>
                        <td>{categorias.find((item) => String(item.id) === String(linha.categoriaId))?.nome || 'Categoria removida'}</td>
                        <td>{fontes.find((item) => String(item.id) === String(linha.fonteDestinoId))?.nome || 'Conta removida'}</td>
                        <td>{linha.dataReferencia.toLocaleDateString('pt-BR')}{cartao && <small className="sub-lancamento">vencimento</small>}</td>
                        <td className={linha.tipo === 'entrada' ? 'valor-entrada' : ''}>{linha.tipo === 'entrada' ? '+' : '−'} {moeda(linha.valorParcela)}</td>
                        <td>
                          <button
                            className="btn danger sm"
                            aria-label={`Excluir ${linha.descricao}`}
                            onClick={() => excluirLancamento(linha.id)}
                          >Excluir</button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="estado-vazio">
            <span className="estado-icone" aria-hidden="true">＋</span>
            <p>Nenhuma movimentação prevista neste mês.</p>
            <small>Adicione uma entrada ou despesa para começar seu planejamento.</small>
          </div>
        )}
      </section>
      <p className="nota-local">Seus lançamentos ficam salvos na sua conta. A meta mensal é armazenada neste navegador e neste dispositivo.</p>
    </div>
  );
}
