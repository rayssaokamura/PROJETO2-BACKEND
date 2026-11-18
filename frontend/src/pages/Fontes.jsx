import { useCrud } from '../useCrud.js';
import { Campo, Alerta, moeda } from '../components.jsx';

const ROTULO = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
const VAZIO = { nome: '', tipo: 'conta', diaFechamento: '', diaVencimento: '', limite: '' };

export default function Fontes() {
  const c = useCrud('/fontes-destinos', VAZIO);
  const f = c.form;
  const cartao = f.tipo === 'cartao_credito';
  const set = (k) => (e) => c.setForm({ ...f, [k]: e.target.value });
  const e = c.erro.campos;

  const enviar = (ev) => c.salvar(ev, {
    nome: f.nome.trim(), tipo: f.tipo,
    ...(cartao && { diaFechamento: Number(f.diaFechamento), diaVencimento: Number(f.diaVencimento), limite: Number(f.limite) }),
  });

  return (
    <>
      <h2>Contas, rendas e cartões</h2>
      <form className="cartao linha" onSubmit={enviar}>
        <Campo label="Nome" value={f.nome} onChange={set('nome')} erro={e.nome} />
        <Campo as="select" label="Tipo" value={f.tipo} onChange={set('tipo')} erro={e.tipo}>
          {Object.entries(ROTULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Campo>
        {cartao && (
          <>
            <Campo label="Dia de fechamento" type="number" min="1" max="31" value={f.diaFechamento} onChange={set('diaFechamento')} erro={e.diaFechamento} />
            <Campo label="Dia de vencimento" type="number" min="1" max="31" value={f.diaVencimento} onChange={set('diaVencimento')} erro={e.diaVencimento} />
            <Campo label="Limite (R$)" type="number" min="0" step="0.01" value={f.limite} onChange={set('limite')} erro={e.limite} />
          </>
        )}
        <button className="btn">{c.editId ? 'Salvar' : 'Adicionar'}</button>
        {c.editId && <button type="button" className="btn ghost" onClick={c.cancelar}>Cancelar</button>}
      </form>
      <Alerta msg={c.erro.mensagem && !Object.keys(e).length ? c.erro.mensagem : ''} />

      <div className="grade3">
        {c.itens.map((i) => (
          <article className="cartao item" key={i.id}>
            <span className="selo">{ROTULO[i.tipo]}</span>
            <h3>{i.nome}</h3>
            {i.tipo === 'cartao_credito' && (
              <p className="detalhe">
                Limite {moeda(i.limite)}<br />Fecha dia {i.dia_fechamento} · Vence dia {i.dia_vencimento}
              </p>
            )}
            <span className="acoes">
              <button className="btn ghost sm" onClick={() => c.editar(i, {
                nome: i.nome, tipo: i.tipo,
                diaFechamento: i.dia_fechamento ?? '', diaVencimento: i.dia_vencimento ?? '', limite: i.limite ?? '',
              })}>Editar</button>
              <button className="btn danger sm" onClick={() => c.excluir(i.id)}>Excluir</button>
            </span>
          </article>
        ))}
      </div>
    </>
  );
}
