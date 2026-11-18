-- Dataset de práctica: cartera de cobranzas ficticia.
-- Fecha de referencia ("hoy") para todos los ejercicios: 2026-11-15.
-- Los datos son deterministas: cada reset produce exactamente el mismo estado.

CREATE TABLE agents (
  id integer PRIMARY KEY,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('voice', 'whatsapp', 'sms', 'email'))
);

CREATE TABLE customers (
  id integer PRIMARY KEY,
  full_name text NOT NULL,
  document_number text NOT NULL UNIQUE,
  city text NOT NULL,
  segment text NOT NULL CHECK (segment IN ('retail', 'pyme')),
  created_at date NOT NULL
);

CREATE TABLE loans (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  principal_cents bigint NOT NULL CHECK (principal_cents > 0),
  installments_count integer NOT NULL CHECK (installments_count > 0),
  disbursed_at date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paid', 'written_off'))
);

CREATE TABLE installments (
  id serial PRIMARY KEY,
  loan_id integer NOT NULL REFERENCES loans (id),
  number integer NOT NULL,
  due_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  paid_cents bigint NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  UNIQUE (loan_id, number)
);

CREATE TABLE payments (
  id serial PRIMARY KEY,
  loan_id integer NOT NULL REFERENCES loans (id),
  provider text NOT NULL,
  external_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  paid_at timestamptz NOT NULL,
  -- Idempotencia: un mismo pago del proveedor no puede registrarse dos veces.
  UNIQUE (provider, external_id)
);

CREATE TABLE payment_promises (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  loan_id integer NOT NULL REFERENCES loans (id),
  promised_at date NOT NULL,
  due_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0)
);

CREATE TABLE campaigns (
  id integer PRIMARY KEY,
  name text NOT NULL,
  channel text NOT NULL,
  starts_at date NOT NULL,
  ends_at date NOT NULL
);

CREATE TABLE campaign_targets (
  campaign_id integer NOT NULL REFERENCES campaigns (id),
  customer_id integer NOT NULL REFERENCES customers (id),
  PRIMARY KEY (campaign_id, customer_id)
);

CREATE TABLE conversations (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES campaigns (id),
  customer_id integer NOT NULL REFERENCES customers (id),
  agent_id integer NOT NULL REFERENCES agents (id),
  started_at timestamptz NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('promise', 'refused', 'no_answer', 'paid', 'escalated')),
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0)
);

INSERT INTO agents (id, name, channel) VALUES
  (1, 'Agente Mora Temprana', 'whatsapp'),
  (2, 'Agente Pyme', 'voice'),
  (3, 'Agente Preventivo', 'sms');

INSERT INTO customers (id, full_name, document_number, city, segment, created_at) VALUES
  (1, 'Ana Gómez', '20111222', 'Buenos Aires', 'retail', '2025-01-10'),
  (2, 'Bruno Díaz', '23333444', 'Córdoba', 'retail', '2025-02-03'),
  (3, 'Carla Romero', '27555666', 'Rosario', 'pyme', '2025-03-15'),
  (4, 'Diego Fernández', '20777888', 'Mendoza', 'retail', '2025-03-20'),
  (5, 'Elena Suárez', '27999000', 'Buenos Aires', 'pyme', '2025-04-02'),
  (6, 'Federico Ruiz', '20121314', 'La Plata', 'retail', '2025-05-11'),
  (7, 'Gabriela Torres', '27151617', 'Córdoba', 'retail', '2025-06-08'),
  (8, 'Hernán Castro', '20181920', 'Salta', 'pyme', '2025-06-30'),
  (9, 'Inés Morales', '27212223', 'Buenos Aires', 'retail', '2025-07-14'),
  (10, 'Julián Ortiz', '20242526', 'Rosario', 'retail', '2025-08-01'),
  (11, 'Karina Vega', '27272829', 'Neuquén', 'pyme', '2025-08-19'),
  (12, 'Lucas Medina', '20303132', 'Mendoza', 'retail', '2025-09-05');

INSERT INTO loans (id, customer_id, principal_cents, installments_count, disbursed_at, status) VALUES
  (1, 1, 1200000, 12, '2026-01-15', 'active'),
  (2, 2, 600000, 6, '2026-03-10', 'paid'),
  (3, 3, 3600000, 12, '2025-12-05', 'active'),
  (4, 4, 900000, 6, '2026-02-20', 'paid'),
  (5, 5, 4800000, 12, '2026-01-05', 'active'),
  (6, 6, 300000, 3, '2026-08-01', 'active'),
  (7, 7, 1800000, 12, '2026-04-12', 'active'),
  (8, 8, 2400000, 12, '2025-11-25', 'active'),
  (9, 9, 450000, 3, '2025-06-01', 'paid'),
  (10, 10, 1500000, 10, '2026-02-01', 'active'),
  (11, 11, 6000000, 12, '2026-03-15', 'active'),
  (12, 12, 750000, 6, '2026-05-18', 'active'),
  (13, 1, 500000, 5, '2025-03-01', 'paid'),
  (14, 4, 2000000, 10, '2025-04-10', 'written_off'),
  (15, 9, 900000, 6, '2026-07-01', 'active'),
  (16, 3, 1200000, 6, '2026-06-20', 'active');

-- Cuotas mensuales iguales. Las vencidas antes de la fecha de referencia se marcan pagas…
INSERT INTO installments (loan_id, number, due_date, amount_cents, paid_cents)
SELECT
  l.id,
  n,
  (l.disbursed_at + make_interval(months => n))::date,
  l.principal_cents / l.installments_count,
  CASE
    WHEN l.status = 'paid' THEN l.principal_cents / l.installments_count
    WHEN (l.disbursed_at + make_interval(months => n))::date < DATE '2026-11-15' THEN l.principal_cents / l.installments_count
    ELSE 0
  END
FROM loans l
CROSS JOIN LATERAL generate_series(1, l.installments_count) AS n;

-- …salvo los atrasos de esta cartera (cuotas impagas desde un número dado) y el préstamo castigado.
UPDATE installments i SET paid_cents = 0
FROM (VALUES (3, 9), (5, 8), (6, 3), (8, 10), (11, 7), (15, 4), (14, 4)) AS overdue (loan_id, from_number)
WHERE i.loan_id = overdue.loan_id AND i.number >= overdue.from_number;

-- Un pago parcial: cuota 8 del préstamo 10 (vence 2026-10-01), pagada a medias.
UPDATE installments SET paid_cents = 75000 WHERE loan_id = 10 AND number = 8;

-- Un pago por cada cuota con monto pagado, dos días antes del vencimiento (el parcial, cinco días después).
INSERT INTO payments (loan_id, provider, external_id, amount_cents, paid_at)
SELECT
  i.loan_id,
  'pasarela',
  'pay_' || i.id,
  i.paid_cents,
  CASE
    WHEN i.paid_cents < i.amount_cents THEN (i.due_date + 5)::timestamp AT TIME ZONE 'UTC' + interval '15 hours'
    ELSE (i.due_date - 2)::timestamp AT TIME ZONE 'UTC' + interval '15 hours'
  END
FROM installments i
WHERE i.paid_cents > 0
ORDER BY i.id;

INSERT INTO payment_promises (id, customer_id, loan_id, promised_at, due_date, amount_cents) VALUES
  (1, 3, 3, '2026-10-20', '2026-10-30', 300000),
  (2, 5, 5, '2026-10-10', '2026-10-25', 400000),
  (3, 10, 10, '2026-10-02', '2026-10-10', 75000),
  (4, 8, 8, '2026-11-01', '2026-11-20', 200000),
  (5, 11, 11, '2026-10-16', '2026-10-31', 500000),
  (6, 6, 6, '2026-11-02', '2026-11-10', 100000),
  (7, 1, 1, '2026-09-10', '2026-09-20', 100000),
  (8, 9, 15, '2026-11-03', '2026-11-12', 150000);

INSERT INTO campaigns (id, name, channel, starts_at, ends_at) VALUES
  (1, 'Mora temprana octubre', 'whatsapp', '2026-10-01', '2026-10-31'),
  (2, 'Recupero pyme', 'voice', '2026-10-15', '2026-11-15'),
  (3, 'Recordatorio preventivo', 'sms', '2026-11-01', '2026-11-30');

INSERT INTO campaign_targets (campaign_id, customer_id) VALUES
  (1, 3), (1, 5), (1, 6), (1, 8), (1, 9), (1, 10), (1, 11),
  (2, 3), (2, 5), (2, 8), (2, 11),
  (3, 1), (3, 2), (3, 7), (3, 12);

INSERT INTO conversations (campaign_id, customer_id, agent_id, started_at, outcome, duration_seconds) VALUES
  (1, 3, 1, '2026-10-05 14:00+00', 'promise', 240),
  (1, 5, 1, '2026-10-06 15:00+00', 'no_answer', 0),
  (1, 5, 1, '2026-10-08 15:00+00', 'promise', 310),
  (1, 6, 1, '2026-10-07 10:00+00', 'refused', 95),
  (1, 8, 1, '2026-10-09 11:30+00', 'no_answer', 0),
  (1, 10, 1, '2026-10-02 09:15+00', 'promise', 180),
  (1, 11, 1, '2026-10-16 16:00+00', 'promise', 200),
  (2, 3, 2, '2026-10-20 13:00+00', 'promise', 420),
  (2, 5, 2, '2026-10-21 13:30+00', 'escalated', 600),
  (2, 8, 2, '2026-11-01 10:00+00', 'promise', 380),
  (3, 1, 3, '2026-11-02 09:00+00', 'paid', 60),
  (3, 7, 3, '2026-11-03 09:05+00', 'no_answer', 0),
  (3, 12, 3, '2026-11-03 09:10+00', 'no_answer', 0);
