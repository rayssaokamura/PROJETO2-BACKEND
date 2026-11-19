import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alerta, moeda } from '../components.jsx';

function nomeMes(mes, curto = false) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: curto ? 'short' : 'long', year: 'numeric' })
    .format(new Date(ano, numero - 1, 1));
}

function graficoProjecao(meses) {
  const valores = meses.map((item) => item.saldoProjetado).filter((valor) => valor != null);
  if (!valores.length) return null;

  const largura = 620;
  const altura = 190;
  const margem = { topo: 18, direita: 20, baixo: 34, esquerda: 20 };
  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(0, ...valores);
  const amplitude = maximo - minimo || 1;
  const x = (indice) => margem.esquerda + indice * ((largura - margem.esquerda - margem.direita) / Math.max(meses.length - 1, 1));
  const y = (valor) => margem.topo + ((maximo - valor) / amplitude) * (altura - margem.topo - margem.baixo);
  const pontos = meses
    .map((item, indice) => item.saldoProjetado == null ? null : `${x(indice)},${y(item.saldoProjetado)}`)
    .filter(Boolean);

  return {
    largura,
    altura,
    pontos: pontos.join(' '),
    yZero: y(0),
    circulos: meses.map((item, indice) => item.saldoProjetado == null ? null : ({
      x: x(indice),
      y: y(item.saldoProjetado),
      item,
    })).filter(Boolean),
  };
}

export default function SaudeFinanceira() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api('/saude-financeira')
      .then((resultado) => {
        if (ativo) setDados(resultado);
      })
      .catch((e) => {
        if (ativo) setErro(e.mensagem || 'Não foi possível carregar sua análise financeira.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  const grafico = dados ? graficoProjecao(dados.projecao.meses) : null;

  return (
    <div className="planejamento saude-financeira">
      <header className="painel-cabecalho">
        <div>
          <span className="sobretitulo">UMA VISÃO DOS SEUS HÁBITOS</span>
          <h1>Saúde financeira</h1>
          <p>Indicadores calculados com base nos lançamentos da sua conta.</p>
        </div>
        <Link className="btn ghost" to="/planejamento">Voltar ao planejamento</Link>
      </header>

      <div className="aviso-educativo" role="note">
        <strong>Conteúdo educativo</strong>
        <span>Esta análise é informativa e não constitui recomendação financeira profissional.</span>
      </div>

      <Alerta msg={erro} />
      {carregando && <p className="texto-secundario">Calculando seus indicadores…</p>}
      {!carregando && !erro && dados && (
        <>
          <section className="indicadores-saude" aria-label="Indicadores financeiros">
            <article className="indicador-card">
              <span className="sobretitulo">TAXA DE POUPANÇA</span>
              <strong className={dados.taxaPoupanca.percentual != null && dados.taxaPoupanca.percentual < 0 ? 'texto-alerta' : 'valor-entrada'}>
                {dados.taxaPoupanca.percentual == null ? '—' : `${dados.taxaPoupanca.percentual.toLocaleString('pt-BR')}%`}
              </strong>
              <small>nos últimos três meses completos</small>
              <p>Entradas {moeda(dados.taxaPoupanca.entradas)} · despesas {moeda(dados.taxaPoupanca.despesas)}</p>
            </article>
            <article className="indicador-card">
              <span className="sobretitulo">COMPROMETIMENTO DOS CARTÕES</span>
              <strong className={dados.comprometimentoCartoes.percentual != null && dados.comprometimentoCartoes.percentual > 30 ? 'texto-alerta' : ''}>
                {dados.comprometimentoCartoes.percentual == null ? '—' : `${dados.comprometimentoCartoes.percentual.toLocaleString('pt-BR')}%`}
              </strong>
              <small>das faturas dos próximos três meses sobre a renda mensal média</small>
              <p>Renda média mensal: {moeda(dados.comprometimentoCartoes.rendaMediaMensal)}</p>
            </article>
            <article className="indicador-card">
              <span className="sobretitulo">PARCELAS REGISTRADAS</span>
              <strong>{moeda(dados.parcelasFuturas.reduce((total, item) => total + item.valor, 0))}</strong>
              <small>em faturas previstas nos próximos seis meses</small>
              <p>Compras novas ainda não registradas não estão incluídas.</p>
            </article>
          </section>

          <section className="cartao projecao-saude">
            <div className="secao-titulo">
              <div>
                <span className="sobretitulo">CENÁRIO ESTIMADO</span>
                <h2>Projeção de saldo mensal</h2>
              </div>
              <span className="contador-lancamentos">próximos seis meses</span>
            </div>
            <p className="texto-secundario">{dados.projecao.explicacao}</p>
            {grafico ? (
              <>
                <div className="grafico-rolagem">
                  <svg className="grafico-linha" viewBox={`0 0 ${grafico.largura} ${grafico.altura}`} role="img" aria-label="Gráfico de linha do saldo mensal projetado">
                    <line x1="20" x2={grafico.largura - 20} y1={grafico.yZero} y2={grafico.yZero} className="linha-zero" />
                    <polyline points={grafico.pontos} className="linha-projecao" />
                    {grafico.circulos.map(({ x, y, item }) => (
                      <circle key={item.mes} cx={x} cy={y} r="5" className={item.saldoProjetado < 0 ? 'ponto-projecao ponto-projecao-negativo' : 'ponto-projecao'}>
                        <title>{nomeMes(item.mes)}: {moeda(item.saldoProjetado)}</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="rotulos-grafico">
                    {dados.projecao.meses.map((item) => (
                      <span key={item.mes}>{nomeMes(item.mes, true).replace(/\s+de\s+\d{4}/, '')}</span>
                    ))}
                  </div>
                </div>
                <div className="lista-projecao">
                  {dados.projecao.meses.map((item) => (
                    <div className="linha-projecao-mes" key={item.mes}>
                      <span>{nomeMes(item.mes)}</span>
                      <span>Parcelas conhecidas: {moeda(item.parcelasConhecidas)}</span>
                      <strong className={item.saldoProjetado != null && item.saldoProjetado < 0 ? 'texto-alerta' : ''}>
                        {item.saldoProjetado == null ? 'Histórico insuficiente' : moeda(item.saldoProjetado)}
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="estado-vazio">
                <p>Registre movimentações para gerar uma projeção.</p>
                <small>A projeção precisa de dados nos últimos três meses completos.</small>
                <Link className="btn" to="/planejamento">Adicionar lançamentos</Link>
              </div>
            )}
          </section>

          <section className="cartao faturas-saude">
            <div className="secao-titulo">
              <div>
                <span className="sobretitulo">COMPROMISSOS FUTUROS</span>
                <h2>Parcelas previstas por mês</h2>
              </div>
            </div>
            <div className="grade-parcelas">
              {dados.parcelasFuturas.map((item) => (
                <article key={item.mes}>
                  <span>{nomeMes(item.mes)}</span>
                  <strong>{moeda(item.valor)}</strong>
                  <small>{item.quantidade} {item.quantidade === 1 ? 'parcela' : 'parcelas'}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="cartao dicas-saude">
            <span className="sobretitulo">SUGESTÕES EDUCATIVAS</span>
            <h2>O que seus números mostram</h2>
            <ul>
              {dados.dicas.map((dica) => <li key={dica}>{dica}</li>)}
            </ul>
            <p className="texto-secundario">Referências usadas: taxa de poupança de 10% e alerta de comprometimento de cartão acima de 30%. São parâmetros educativos, não metas universais.</p>
          </section>
          <p className="nota-local">Análise calculada no servidor com os lançamentos registrados. {dados.projecao.explicacao}</p>
        </>
      )}
    </div>
  );
}
