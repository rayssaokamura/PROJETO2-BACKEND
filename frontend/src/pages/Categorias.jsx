import { useCrud } from '../useCrud.js';
import { Campo, Alerta } from '../components.jsx';

const TIPOS = { entrada: 'Entradas', saida: 'Saídas' };

export default function Categorias() {
  const c = useCrud('/categorias', { nome: '', tipo: 'saida' });
  return (
    <>
      <h2>Categorias</h2>
      <form className="cartao linha" onSubmit={(e) => c.salvar(e, c.form)}>
        <Campo label="Nome" value={c.form.nome} erro={c.erro.campos.nome} onChange={(e) => c.setForm({ ...c.form, nome: e.target.value })} />
        <Campo as="select" label="Tipo" value={c.form.tipo} erro={c.erro.campos.tipo} onChange={(e) => c.setForm({ ...c.form, tipo: e.target.value })}>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </Campo>
        <button className="btn">{c.editId ? 'Salvar' : 'Adicionar'}</button>
        {c.editId && <button type="button" className="btn ghost" onClick={c.cancelar}>Cancelar</button>}
      </form>
      <Alerta msg={c.erro.mensagem && !Object.keys(c.erro.campos).length ? c.erro.mensagem : ''} />

      <div className="grade2">
        {Object.entries(TIPOS).map(([tipo, titulo]) => (
          <section className="cartao" key={tipo}>
            <h3><span className={`ponto ${tipo}`} /> {titulo}</h3>
            <ul className="lista">
              {c.itens.filter((i) => i.tipo === tipo).map((i) => (
                <li key={i.id}>
                  <span>{i.nome}</span>
                  <span className="acoes">
                    <button className="btn ghost sm" onClick={() => c.editar(i, { nome: i.nome, tipo: i.tipo })}>Editar</button>
                    <button className="btn danger sm" onClick={() => c.excluir(i.id)}>Excluir</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
