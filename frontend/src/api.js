const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getToken = () => localStorage.getItem('token');
export const setSessao = (token, usuario) => {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
};
export const limparSessao = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

export async function api(caminho, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(BASE + caminho, { method, headers, body: body && JSON.stringify(body) });
  } catch {
    throw { mensagem: 'Não foi possível conectar ao servidor.', campos: {} };
  }

  if (res.status === 204) return null;
  const dados = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && getToken()) {
      limparSessao();
      window.location.href = '/login';
    }
    throw { mensagem: dados.erro || 'Erro inesperado.', campos: dados.campos || {}, status: res.status };
  }
  return dados;
}
