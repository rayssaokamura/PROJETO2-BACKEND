import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getToken, limparSessao } from './api.js';
import { Login, Cadastro } from './pages/Auth.jsx';
import Categorias from './pages/Categorias.jsx';
import Fontes from './pages/Fontes.jsx';
import './styles.css';

function Privado() {
  const nav = useNavigate();
  if (!getToken()) return <Navigate to="/login" replace />;
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const sair = () => { limparSessao(); nav('/login'); };
  return (
    <div className="app">
      <header className="topo">
        <strong className="logo">💰 Finanças</strong>
        <nav>
          <NavLink to="/categorias">Categorias</NavLink>
          <NavLink to="/fontes">Contas e cartões</NavLink>
        </nav>
        <div className="usuario">
          <span>{usuario.nome}</span>
          <button className="btn ghost" onClick={sair}>Sair</button>
        </div>
      </header>
      <main className="conteudo"><Outlet /></main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route element={<Privado />}>
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/fontes" element={<Fontes />} />
      </Route>
      <Route path="*" element={<Navigate to="/categorias" replace />} />
    </Routes>
  </BrowserRouter>
);
