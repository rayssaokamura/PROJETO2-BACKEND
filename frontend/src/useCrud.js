import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Lógica compartilhada de listar / salvar / excluir
export function useCrud(rota, vazio) {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [erro, setErro] = useState({ mensagem: '', campos: {} });

  const carregar = useCallback(() => api(rota).then(setItens).catch(setErro), [rota]);
  useEffect(() => { carregar(); }, [carregar]);

  const cancelar = () => { setForm(vazio); setEditId(null); setErro({ mensagem: '', campos: {} }); };
  const editar = (item, valores) => { setEditId(item.id); setForm(valores); };

  const salvar = async (e, corpo) => {
    e.preventDefault();
    setErro({ mensagem: '', campos: {} });
    try {
      await api(editId ? `${rota}/${editId}` : rota, { method: editId ? 'PUT' : 'POST', body: corpo });
      cancelar(); carregar();
    } catch (err) { setErro(err); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este item?')) return;
    try { await api(`${rota}/${id}`, { method: 'DELETE' }); carregar(); }
    catch (err) { setErro(err); }
  };

  return { itens, form, setForm, editId, erro, salvar, excluir, editar, cancelar };
}
