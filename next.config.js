const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aponta explicitamente para a raiz do projeto Next (subpasta 'vendas')
  outputFileTracingRoot: path.resolve(__dirname),
  // Melhora compatibilidade em Windows em alguns cenários de I/O
  // e evita acúmulo de artefatos antigos de build
  cleanDistDir: true,
  // Usa diretório alternativo para build para contornar locks no Windows
  // Voltar ao diretório padrão para evitar erro EPERM no 'build/trace'
  distDir: '.next',
  eslint: {
    // Não falhar o build por causa de erros de ESLint
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig