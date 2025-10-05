/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores principais
        primary: {
          DEFAULT: '#0d9488', // Verde-água principal (teal-600)
          dark: '#0f766e',   // Verde-água escuro (teal-700)
          light: '#14b8a6',  // Verde-água claro (teal-500)
          lighter: '#5eead4', // Verde-água mais claro (teal-400)
          lightest: '#ccfbf1', // Verde-água bem claro (teal-50)
          foreground: '#ffffff', // Texto branco para contraste
        },
        // Cores secundárias
        secondary: {
          DEFAULT: '#0d9488', // Verde-água como secundário
          dark: '#0f766e',   // Verde-água escuro
          light: '#14b8a6',  // Verde-água claro
          lighter: '#5eead4', // Verde-água mais claro
          lightest: '#f0fdfa', // Verde-água bem claro (teal-50)
          foreground: '#ffffff', // Texto branco para contraste
        },
        // Cores de feedback
        success: {
          DEFAULT: '#10b981', // Verde para sucesso (emerald-500)
          dark: '#0d9f7e',   // Verde escuro para sucesso
          light: '#34d399',  // Verde claro para sucesso (emerald-400)
          lighter: '#6ee7b7', // Verde mais claro (emerald-300)
          lightest: '#ecfdf5', // Verde bem claro (emerald-50)
          foreground: '#ffffff', // Texto branco para contraste
        },
        error: {
          DEFAULT: '#ef4444', // Vermelho para erros (red-500)
          dark: '#dc2626',   // Vermelho escuro para erros (red-600)
          light: '#f87171',  // Vermelho claro para erros (red-400)
          lighter: '#fca5a5', // Vermelho mais claro (red-300)
          lightest: '#fef2f2', // Vermelho bem claro (red-50)
          foreground: '#ffffff', // Texto branco para contraste
        },
        warning: {
          DEFAULT: '#f59e0b', // Amarelo para alertas (amber-500)
          dark: '#d97706',   // Amarelo escuro para alertas (amber-600)
          light: '#fbbf24',  // Amarelo claro para alertas (amber-400)
          lighter: '#fcd34d', // Amarelo mais claro (amber-300)
          lightest: '#fffbeb', // Amarelo bem claro (amber-50)
          foreground: '#78350f', // Texto escuro para contraste
        },
        info: {
          DEFAULT: '#3b82f6', // Azul para informações (blue-500)
          dark: '#2563eb',   // Azul escuro para informações (blue-600)
          light: '#60a5fa',  // Azul claro para informações (blue-400)
          lighter: '#93c5fd', // Azul mais claro (blue-300)
          lightest: '#eff6ff', // Azul bem claro (blue-50)
          foreground: '#ffffff', // Texto branco para contraste
        },
        // Cores de fundo e superfície
        background: {
          DEFAULT: '#ffffff', // Fundo branco
          light: '#f8fafc',  // Fundo cinza claro (slate-50)
          dark: '#f1f5f9',   // Fundo cinza mais escuro (slate-100)
          paper: '#ffffff',  // Fundo para componentes de papel
          paperHover: '#f8fafc', // Fundo para hover em componentes de papel
        },
        // Cores de texto
        foreground: {
          DEFAULT: '#0f172a', // Texto preto azulado (slate-900)
          secondary: '#334155', // Texto secundário (slate-700)
          muted: '#64748b',   // Texto desbotado (slate-500)
          light: '#94a3b8',   // Texto claro (slate-400)
          onPrimary: '#ffffff', // Texto sobre fundo primário
          onSecondary: '#ffffff', // Texto sobre fundo secundário
          onSuccess: '#ffffff', // Texto sobre fundo de sucesso
          onError: '#ffffff',   // Texto sobre fundo de erro
          onWarning: '#78350f', // Texto sobre fundo de alerta
          onInfo: '#ffffff',    // Texto sobre fundo de informação
        },
        // Cores de borda
        border: {
          DEFAULT: '#e2e8f0',  // Borda padrão (slate-200)
          light: '#f1f5f9',   // Borda clara (slate-100)
          dark: '#cbd5e1',    // Borda escura (slate-300)
          primary: '#0d9488', // Borda primária
          secondary: '#14b8a6', // Borda secundária
          success: '#10b981', // Borda de sucesso
          error: '#ef4444',   // Borda de erro
          warning: '#f59e0b', // Borda de alerta
          info: '#3b82f6',    // Borda de informação
        },
        // Cores de componentes
        card: {
          DEFAULT: '#ffffff',  // Fundo dos cards
          hover: '#f8fafc',   // Hover mais claro
          border: '#e2e8f0',  // Borda dos cards
          shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // Sombra dos cards
        },
        sidebar: {
          DEFAULT: '#0d9488',   // Fundo da barra lateral
          foreground: '#ffffff', // Texto na barra lateral
          hover: '#0f766e',     // Hover nos itens da barra lateral
          active: '#14b8a6',    // Item ativo na barra lateral
          border: '#0f766e',    // Borda da barra lateral
        },
        header: {
          DEFAULT: '#ffffff',   // Fundo do cabeçalho
          foreground: '#0f172a', // Texto no cabeçalho
          border: '#e2e8f0',   // Borda do cabeçalho
          shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // Sombra do cabeçalho
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
        // Sombras personalizadas
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'button': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'button-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      backgroundImage: {
        // Gradientes personalizados
        'gradient-primary': 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        'gradient-primary-light': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-info': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        'gradient-light': 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-sidebar': 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        // Gradientes com transparência
        'gradient-primary-30': 'linear-gradient(135deg, rgba(13, 148, 136, 0.3) 0%, rgba(15, 118, 110, 0.3) 100%)',
        'gradient-success-30': 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)',
        'gradient-error-30': 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)',
        'gradient-warning-30': 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 100%)',
        'gradient-info-30': 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.3) 100%)',
      },
    },
  },
  plugins: [],
}