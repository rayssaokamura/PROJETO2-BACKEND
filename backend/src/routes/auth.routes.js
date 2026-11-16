import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { UsuarioModel } from '../models/usuario.model.js';
import { cpfValido } from '../config/utils.js';
import { autenticar } from '../middlewares/autenticar.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas
  message: { erro: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

router.post('/cadastro', async (req, res, next) => {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body;
  const campos = {};

  if (!nome || !nome.trim()) campos.nome = 'Nome é obrigatório.';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    campos.email = 'E-mail inválido.';
  }

  if (!cpf || !cpfValido(cpf)) {
    campos.cpf = 'CPF inválido.';
  }

  if (!senha || senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }

  if (senha !== confirmacaoSenha) {
    campos.confirmacaoSenha = 'As senhas não coincidem.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await UsuarioModel.criar({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: String(cpf).replace(/\D/g, ''),
      senhaHash
    });

    return res.status(201).json(usuario);
  } catch (erro) {
    if (erro.code === '23505') {
      const campo = erro.constraint?.includes('cpf') ? 'cpf' : 'email';
      return res.status(409).json({
        erro: 'Usuário já cadastrado.',
        campos: { [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.` }
      });
    }
    return next(erro);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const usuario = await UsuarioModel.buscarPorEmail(email.trim().toLowerCase());
    
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign(
      { sub: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (erro) {
    return next(erro);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await UsuarioModel.buscarPorId(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json(usuario);
  } catch (erro) {
    return next(erro);
  }
});

export default router;