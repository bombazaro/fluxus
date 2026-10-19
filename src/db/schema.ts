export const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    icone TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    tipo TEXT NOT NULL CHECK(tipo IN ('unica', 'fixa', 'parcelada', 'variavel')),
    valor_centavos INTEGER NOT NULL,
    dia_vencimento INTEGER,
    data_unica TEXT,
    parcelas_total INTEGER,
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    ativa INTEGER NOT NULL DEFAULT 1,
    compartilhada INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    mes_ref TEXT NOT NULL,
    vencimento TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    pago INTEGER NOT NULL DEFAULT 0,
    pago_em TEXT,
    parcela_numero INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_lancamentos_mes_ref ON lancamentos(mes_ref);
  CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_id ON lancamentos(conta_id);

  CREATE TABLE IF NOT EXISTS rendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    dia_recebimento INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'fixa',
    ativa INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rendas_recebidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    renda_id INTEGER NOT NULL REFERENCES rendas(id) ON DELETE CASCADE,
    mes_ref TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    recebida_em TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rendas_recebidas_mes_ref ON rendas_recebidas(mes_ref);

  CREATE TABLE IF NOT EXISTS reserva_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    valor_meta_centavos INTEGER NOT NULL,
    tipo_meta TEXT NOT NULL DEFAULT 'fixo',
    meses_gastos INTEGER DEFAULT 6
  );

  CREATE TABLE IF NOT EXISTS reserva_aportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    valor_centavos INTEGER NOT NULL,
    data TEXT NOT NULL,
    observacao TEXT
  );

  CREATE TABLE IF NOT EXISTS pessoas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS divisoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lancamento_id INTEGER NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
    pessoa_id INTEGER NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    valor_centavos INTEGER NOT NULL,
    pago INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_divisoes_lancamento ON divisoes(lancamento_id);
`;

export const CATEGORIAS_PADRAO = [
  { nome: 'Moradia', cor: '#0F766E', icone: 'home' },
  { nome: 'Alimentação', cor: '#EA580C', icone: 'fast-food' },
  { nome: 'Transporte', cor: '#2563EB', icone: 'car' },
  { nome: 'Saúde', cor: '#E11D48', icone: 'medkit' },
  { nome: 'Lazer', cor: '#9333EA', icone: 'game-controller' },
  { nome: 'Educação', cor: '#0284C7', icone: 'school' },
  { nome: 'Assinaturas', cor: '#4F46E5', icone: 'tv' },
  { nome: 'Outros', cor: '#64748B', icone: 'ellipsis-horizontal' },
];
