export function tratarErros(err, req, res, next) {
  console.error(err);

  if (err.status) {
    return res.status(err.status).json({
      erro: err.message,
      ...(err.campos && { campos: err.campos })
    });
  }

  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}