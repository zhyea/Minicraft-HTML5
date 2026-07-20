type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, prefix: string, message: string, err?: unknown): void {
  const tag = `[${prefix}] ${message}`;
  if (level === 'warn') console.warn(tag, err ?? '');
  else if (level === 'error') console.error(tag, err ?? '');
  else console.log(tag);
}

export const logger = {
  warn: (prefix: string, message: string, err?: unknown) => emit('warn', prefix, message, err),
  error: (prefix: string, message: string, err?: unknown) => emit('error', prefix, message, err),
  info: (prefix: string, message: string) => emit('info', prefix, message),
  debug: (prefix: string, message: string) => emit('debug', prefix, message),
};
