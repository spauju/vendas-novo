/**
 * 🔧 Sistema de Logging Centralizado para Supabase
 * 
 * Utilitário para padronizar logs com:
 * - Timestamps formatados
 * - Níveis de severidade
 * - Contexto adicional
 * - Mensagens descritivas
 * - Facilidade de análise
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum LogCategory {
  SUPABASE_CONFIG = 'SUPABASE_CONFIG',
  SUPABASE_CONNECTION = 'SUPABASE_CONNECTION',
  SUPABASE_AUTH = 'SUPABASE_AUTH',
  SUPABASE_DATABASE = 'SUPABASE_DATABASE',
  SUPABASE_STORAGE = 'SUPABASE_STORAGE',
  SUPABASE_REALTIME = 'SUPABASE_REALTIME'
}

interface LogContext {
  userId?: string
  sessionId?: string
  operation?: string
  table?: string
  module?: string
  component?: string
  duration?: number
  metadata?: Record<string, any>
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  context?: LogContext
  error?: Error | any
}

class SupabaseLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private enableConsoleOutput = true
  private logHistory: LogEntry[] = []
  private maxHistorySize = 1000

  /**
   * 📝 Formatar timestamp para logs
   */
  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 23)
  }

  /**
   * 🎨 Obter emoji e cor para o nível de log
   */
  private getLogStyle(level: LogLevel): { emoji: string; color: string } {
    const styles = {
      [LogLevel.DEBUG]: { emoji: '🔍', color: '#6B7280' },
      [LogLevel.INFO]: { emoji: '✅', color: '#10B981' },
      [LogLevel.WARN]: { emoji: '⚠️', color: '#F59E0B' },
      [LogLevel.ERROR]: { emoji: '❌', color: '#EF4444' },
      [LogLevel.CRITICAL]: { emoji: '🚨', color: '#DC2626' }
    }
    return styles[level]
  }

  /**
   * 📊 Criar entrada de log estruturada
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error | any
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined
    }

    // Adicionar ao histórico
    this.logHistory.push(entry)
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift()
    }

    return entry
  }

  /**
   * 🖨️ Formatar saída para console
   */
  private formatConsoleOutput(entry: LogEntry): string {
    const { emoji } = this.getLogStyle(entry.level)
    const contextStr = entry.context ? 
      ` | ${Object.entries(entry.context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          // Serializar objetos complexos como JSON para evitar [object Object]
          if (typeof value === 'object' && value !== null) {
            try {
              return `${key}=${JSON.stringify(value)}`
            } catch {
              return `${key}=[object Object]`
            }
          }
          return `${key}=${value}`
        })
        .join(', ')}` : ''
    
    return `${emoji} [${entry.timestamp}] ${entry.level} | ${entry.category} | ${entry.message}${contextStr}`
  }

  /**
   * 📤 Método genérico de log
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error | any
  ): void {
    const entry = this.createLogEntry(level, category, message, context, error)

    if (this.enableConsoleOutput) {
      const output = this.formatConsoleOutput(entry)
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(output)
          break
        case LogLevel.INFO:
          console.log(output)
          break
        case LogLevel.WARN:
          console.warn(output)
          break
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(output)
          if (entry.error && this.isDevelopment) {
            // Verificar se o erro tem stack trace válido
            if (entry.error.stack) {
              console.error('Stack trace:', entry.error.stack)
            } else if (entry.error instanceof Error) {
              console.error('Error object:', entry.error)
            } else {
              console.error('Error details:', JSON.stringify(entry.error, null, 2))
            }
          }
          break
      }
    }
  }

  // 🔧 Métodos específicos para configuração do Supabase
  configMissing(variables: string[], context?: LogContext): void {
    this.log(
      LogLevel.CRITICAL,
      LogCategory.SUPABASE_CONFIG,
      `Variáveis de ambiente do Supabase não configuradas: ${variables.join(', ')}`,
      {
        ...context,
        operation: 'config_validation',
        metadata: { missingVars: variables }
      }
    )
  }

  configInvalid(variable: string, reason: string, context?: LogContext): void {
    this.log(
      LogLevel.ERROR,
      LogCategory.SUPABASE_CONFIG,
      `Variável de ambiente inválida: ${variable} - ${reason}`,
      {
        ...context,
        operation: 'config_validation',
        metadata: { variable, reason }
      }
    )
  }

  configValid(context?: LogContext): void {
    this.log(
      LogLevel.INFO,
      LogCategory.SUPABASE_CONFIG,
      'Configuração do Supabase validada com sucesso',
      {
        ...context,
        operation: 'config_validation'
      }
    )
  }

  // 🔌 Métodos específicos para conexão
  connectionSuccess(context?: LogContext): void {
    this.log(
      LogLevel.INFO,
      LogCategory.SUPABASE_CONNECTION,
      'Conexão com Supabase estabelecida com sucesso',
      {
        ...context,
        operation: 'connection_test'
      }
    )
  }

  connectionFailed(error: any, context?: LogContext): void {
    this.log(
      LogLevel.ERROR,
      LogCategory.SUPABASE_CONNECTION,
      'Falha na conexão com Supabase',
      {
        ...context,
        operation: 'connection_test'
      },
      error
    )
  }

  connectionTimeout(timeout: number, context?: LogContext): void {
    this.log(
      LogLevel.WARN,
      LogCategory.SUPABASE_CONNECTION,
      `Timeout na conexão com Supabase após ${timeout}ms`,
      {
        ...context,
        operation: 'connection_test',
        metadata: { timeout }
      }
    )
  }

  // 🔐 Métodos específicos para autenticação
  authSuccess(operation: string, userId?: string, context?: LogContext): void {
    this.log(
      LogLevel.INFO,
      LogCategory.SUPABASE_AUTH,
      `Operação de autenticação bem-sucedida: ${operation}`,
      {
        ...context,
        userId,
        operation
      }
    )
  }

  authFailed(operation: string, error: any, context?: LogContext): void {
    this.log(
      LogLevel.ERROR,
      LogCategory.SUPABASE_AUTH,
      `Falha na operação de autenticação: ${operation}`,
      {
        ...context,
        operation
      },
      error
    )
  }

  authTokenExpired(context?: LogContext): void {
    this.log(
      LogLevel.WARN,
      LogCategory.SUPABASE_AUTH,
      'Token de autenticação expirado, renovação necessária',
      {
        ...context,
        operation: 'token_validation'
      }
    )
  }

  // 🗄️ Métodos específicos para banco de dados
  dbOperationSuccess(operation: string, table: string, context?: LogContext): void {
    this.log(
      LogLevel.INFO,
      LogCategory.SUPABASE_DATABASE,
      `Operação de banco bem-sucedida: ${operation} em ${table}`,
      {
        ...context,
        operation,
        table
      }
    )
  }

  dbOperationFailed(operation: string, table: string, error: any, context?: LogContext): void {
    this.log(
      LogLevel.ERROR,
      LogCategory.SUPABASE_DATABASE,
      `Falha na operação de banco: ${operation} em ${table}`,
      {
        ...context,
        operation,
        table
      },
      error
    )
  }

  dbPermissionDenied(operation: string, table: string, context?: LogContext): void {
    this.log(
      LogLevel.ERROR,
      LogCategory.SUPABASE_DATABASE,
      `Permissão negada para ${operation} em ${table}`,
      {
        ...context,
        operation,
        table,
        metadata: { errorType: 'permission_denied' }
      }
    )
  }

  // 📊 Métodos utilitários
  getLogHistory(): LogEntry[] {
    return [...this.logHistory]
  }

  clearHistory(): void {
    this.logHistory = []
  }

  setConsoleOutput(enabled: boolean): void {
    this.enableConsoleOutput = enabled
  }

  // 🔍 Método genérico para logs customizados
  custom(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error | any
  ): void {
    this.log(level, category, message, context, error)
  }
}

// 🌟 Instância singleton do logger
export const supabaseLogger = new SupabaseLogger()

// 🎯 Funções de conveniência para uso rápido
export const logSupabaseConfig = {
  missing: (variables: string[], context?: LogContext) => 
    supabaseLogger.configMissing(variables, context),
  invalid: (variable: string, reason: string, context?: LogContext) => 
    supabaseLogger.configInvalid(variable, reason, context),
  valid: (context?: LogContext) => 
    supabaseLogger.configValid(context)
}

export const logSupabaseConnection = {
  success: (context?: LogContext) => 
    supabaseLogger.connectionSuccess(context),
  failed: (error: any, context?: LogContext) => 
    supabaseLogger.connectionFailed(error, context),
  timeout: (timeout: number, context?: LogContext) => 
    supabaseLogger.connectionTimeout(timeout, context)
}

export const logSupabaseAuth = {
  success: (operation: string, userId?: string, context?: LogContext) => 
    supabaseLogger.authSuccess(operation, userId, context),
  failed: (operation: string, error: any, context?: LogContext) => 
    supabaseLogger.authFailed(operation, error, context),
  tokenExpired: (context?: LogContext) => 
    supabaseLogger.authTokenExpired(context)
}

export const logSupabaseDB = {
  success: (operation: string, table?: string | LogContext, context?: LogContext) => {
    if (typeof table === 'object') {
      supabaseLogger.dbOperationSuccess(operation, '', table)
    } else {
      supabaseLogger.dbOperationSuccess(operation, table || '', context)
    }
  },
  failed: (operation: string, tableOrError: string | any, errorOrContext?: any, context?: LogContext) => {
    if (typeof tableOrError === 'string') {
      supabaseLogger.dbOperationFailed(operation, tableOrError, errorOrContext, context)
    } else {
      supabaseLogger.dbOperationFailed(operation, '', tableOrError, errorOrContext)
    }
  },
  permissionDenied: (operation: string, table: string, context?: LogContext) => 
    supabaseLogger.dbPermissionDenied(operation, table, context)
}