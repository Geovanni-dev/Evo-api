export class DataRefeicaoInvalidaError extends Error {
  constructor() {
    super(
      'Data da refeição inválida. Fora da janela permitida (-2 a +1 dias).',
    );
    this.name = 'DataRefeicaoInvalidaError';
  }
}

export class TdeeNaoEncontradoError extends Error {
  constructor() {
    super('TDEE não encontrado');
    this.name = 'TdeeNaoEncontradoError';
  }
}

export class RefeicaoNaoEncontradaError extends Error {
  constructor() {
    super('Refeição não encontrada');
    this.name = 'RefeicaoNaoEncontradaError';
  }
}

export class ItemNaoEncontradoError extends Error {
  constructor() {
    super('Item não encontrado');
    this.name = 'ItemNaoEncontradoError';
  }
}

export class UsuarioNaoEncontradoError extends Error {
  constructor() {
    super('Usuário não encontrado');
    this.name = 'UsuarioNaoEncontradoError';
  }
}

export class MetaNutricionalNaoEncontradaError extends Error {
  constructor() {
    super('Meta nutricional não encontrada');
    this.name = 'MetaNutricionalNaoEncontradaError';
  }
}

export class PreferenciasNaoEncontradasError extends Error {
  constructor() {
    super('Preferências não encontradas');
    this.name = 'PreferenciasNaoEncontradasError';
  }
}

export class RespostaLimiteTokensError extends Error {
  constructor() {
    super('Resposta da IA foi interrompida por limite de tokens');
    this.name = 'RespostaLimiteTokensError';
  }
}

export class RespostaVaziaError extends Error {
  constructor() {
    super('Resposta da IA está vazia');
    this.name = 'RespostaVaziaError';
  }
}

export class RespostaJsonInvalidaError extends Error {
  constructor(cause: unknown) {
    super('Resposta da IA não é um JSON válido', { cause });
    this.name = 'RespostaJsonInvalidaError';
  }
}

export class DietaForaDaMetaError extends Error {
  constructor(cause?: unknown) {
    super('Dieta gerada não bate com o TDEE', { cause });
    this.name = 'DietaForaDaMetaError';
  }
}
