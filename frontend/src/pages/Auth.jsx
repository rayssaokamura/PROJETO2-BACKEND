import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setSessao } from '../api.js';
import { Campo, Alerta } from '../components.jsx';

function useForm(inicial) {
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState({ mensagem: '', campos: {} });
  const [carregando, setCarregando] = useState(false);
  const mudar = (e) => setV({ ...v, [e.target.name]: e.target.value });
  return { v, mudar, erro, setErro, carregando, setCarregando };
}

export function Login() {
  const f = useForm({ email: '', senha: '' });
  const nav = useNavigate();
  const enviar = async (e) => {
    e.preventDefault();
    f.setCarregando(true); f.setErro({ mensagem: '', campos: {} });
    try {
      const { token, usuario } = await api('/auth/login', { method: 'POST', body: f.v });
      setSessao(token, usuario);
      nav('/planejamento');
    } catch (err) { f.setErro(err); }
    f.setCarregando(false);
  };
  return (
    <div className="auth">
      <form className="cartao" onSubmit={enviar}>
        <h1>💰 Finanças</h1>
        <p className="sub">Entre na sua conta</p>
        <Alerta msg={f.erro.mensagem} />
        <Campo label="E-mail" name="email" type="email" value={f.v.email} onChange={f.mudar} required />
        <Campo label="Senha" name="senha" type="password" value={f.v.senha} onChange={f.mudar} required />
        <button className="btn" disabled={f.carregando}>{f.carregando ? 'Entrando…' : 'Entrar'}</button>
        <p className="troca">Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
      </form>
    </div>
  );
}

export function Cadastro() {
  const f = useForm({ nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' });
  const nav = useNavigate();
  const enviar = async (e) => {
    e.preventDefault();
    f.setCarregando(true); f.setErro({ mensagem: '', campos: {} });
    try {
      await api('/auth/cadastro', { method: 'POST', body: f.v });
      nav('/login');
    } catch (err) { f.setErro(err); }
    f.setCarregando(false);
  };
  const c = f.erro.campos;
  return (
    <div className="auth">
      <form className="cartao" onSubmit={enviar}>
        <h1>Criar conta</h1>
        <Alerta msg={f.erro.mensagem && !Object.keys(c).length ? f.erro.mensagem : ''} />
        <Campo label="Nome" name="nome" value={f.v.nome} onChange={f.mudar} erro={c.nome} />
        <Campo label="E-mail" name="email" type="email" value={f.v.email} onChange={f.mudar} erro={c.email} />
        <Campo label="CPF" name="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={f.v.cpf} onChange={f.mudar} erro={c.cpf} />
        <Campo label="Senha" name="senha" type="password" value={f.v.senha} onChange={f.mudar} erro={c.senha} />
        <Campo label="Confirmar senha" name="confirmacaoSenha" type="password" value={f.v.confirmacaoSenha} onChange={f.mudar} erro={c.confirmacaoSenha} />
        <button className="btn" disabled={f.carregando}>{f.carregando ? 'Criando…' : 'Cadastrar'}</button>
        <p className="troca">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
