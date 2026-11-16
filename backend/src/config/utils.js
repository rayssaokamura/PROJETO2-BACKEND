// src/config/utils.js

// Valida os dois dígitos verificadores do CPF
export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, ''); // mantém só os dígitos
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return false; // rejeita 111.111.111-11, etc.
  }
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}