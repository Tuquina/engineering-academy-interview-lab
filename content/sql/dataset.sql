-- Dataset de práctica: un marketplace ficticio (catálogo, pedidos, pagos, envíos, reseñas y soporte) y un esquema
-- chico de reservas de hotel para los ejercicios de rangos de fechas.
-- Fecha de referencia ("hoy") para todos los ejercicios: 2026-11-15 (00:00 UTC).
-- Los datos son deterministas: cada reset produce exactamente el mismo estado.

CREATE TABLE customers (
  id integer PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  city text NOT NULL,
  created_at date NOT NULL
);

CREATE TABLE sellers (
  id integer PRIMARY KEY,
  name text NOT NULL UNIQUE,
  city text NOT NULL
);

CREATE TABLE products (
  id integer PRIMARY KEY,
  seller_id integer NOT NULL REFERENCES sellers (id),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('electrónica', 'hogar', 'libros', 'deportes')),
  price_cents bigint NOT NULL CHECK (price_cents > 0)
);

CREATE TABLE orders (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id integer NOT NULL REFERENCES orders (id),
  product_id integer NOT NULL REFERENCES products (id),
  quantity integer NOT NULL CHECK (quantity > 0),
  -- Precio al momento de la compra: el precio del producto puede cambiar después.
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE payments (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders (id),
  provider text NOT NULL,
  external_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  paid_at timestamptz NOT NULL,
  -- Idempotencia: un mismo pago del proveedor no puede registrarse dos veces.
  UNIQUE (provider, external_id)
);

CREATE TABLE shipments (
  id integer PRIMARY KEY,
  order_id integer NOT NULL UNIQUE REFERENCES orders (id),
  carrier text NOT NULL,
  shipped_at date NOT NULL,
  -- Fecha de entrega comprometida con el cliente.
  promised_by date NOT NULL CHECK (promised_by >= shipped_at)
);

CREATE TABLE shipment_events (
  id serial PRIMARY KEY,
  shipment_id integer NOT NULL REFERENCES shipments (id),
  status text NOT NULL CHECK (status IN ('picked_up', 'in_transit', 'out_for_delivery', 'failed_attempt', 'delivered')),
  occurred_at timestamptz NOT NULL
);

CREATE TABLE reviews (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products (id),
  customer_id integer NOT NULL REFERENCES customers (id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at date NOT NULL,
  UNIQUE (product_id, customer_id)
);

CREATE TABLE support_tickets (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  order_id integer REFERENCES orders (id),
  priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  subject text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE ticket_messages (
  id serial PRIMARY KEY,
  ticket_id integer NOT NULL REFERENCES support_tickets (id),
  author text NOT NULL CHECK (author IN ('customer', 'agent')),
  sent_at timestamptz NOT NULL
);

-- Reservas: rangos semiabiertos [check_in, check_out): quien sale el día 20 libera la habitación para quien entra el 20.
CREATE TABLE rooms (
  id integer PRIMARY KEY,
  hotel text NOT NULL,
  room_number text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  UNIQUE (hotel, room_number)
);

CREATE TABLE room_bookings (
  id integer PRIMARY KEY,
  room_id integer NOT NULL REFERENCES rooms (id),
  guest_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  CHECK (check_out > check_in)
);

INSERT INTO customers (id, full_name, email, city, created_at) VALUES
  (1, 'Ana Gómez', 'ana@example.com', 'Buenos Aires', '2025-01-10'),
  (2, 'Bruno Díaz', 'bruno@example.com', 'Córdoba', '2025-02-03'),
  (3, 'Carla Romero', 'carla@example.com', 'Rosario', '2025-03-15'),
  (4, 'Diego Fernández', 'diego@example.com', 'Mendoza', '2025-03-20'),
  (5, 'Elena Suárez', 'elena@example.com', 'Buenos Aires', '2025-04-02'),
  (6, 'Federico Ruiz', 'federico@example.com', 'La Plata', '2025-05-11'),
  (7, 'Gabriela Torres', 'gabriela@example.com', 'Córdoba', '2025-06-08'),
  (8, 'Hernán Castro', 'hernan@example.com', 'Salta', '2025-06-30'),
  (9, 'Inés Morales', 'ines@example.com', 'Buenos Aires', '2025-07-14'),
  (10, 'Julián Ortiz', 'julian@example.com', 'Rosario', '2025-08-01'),
  (11, 'Karina Vega', 'karina@example.com', 'Neuquén', '2025-08-19'),
  (12, 'Lucas Medina', 'lucas@example.com', 'Mendoza', '2025-09-05');

INSERT INTO sellers (id, name, city) VALUES
  (1, 'TecnoSur', 'Córdoba'),
  (2, 'Casa Nativa', 'Mendoza'),
  (3, 'Librería del Puerto', 'Rosario'),
  (4, 'DeportesYa', 'Buenos Aires'),
  (5, 'Verde Hogar', 'La Plata');

INSERT INTO products (id, seller_id, name, category, price_cents) VALUES
  (1, 1, 'Auriculares inalámbricos', 'electrónica', 4500000),
  (2, 1, 'Teclado mecánico', 'electrónica', 6200000),
  (3, 1, 'Cargador USB-C 65 W', 'electrónica', 1800000),
  (4, 2, 'Juego de sábanas', 'hogar', 3200000),
  (5, 2, 'Lámpara de pie', 'hogar', 5400000),
  (6, 5, 'Maceta autorriego', 'hogar', 900000),
  (7, 5, 'Kit de huerta', 'hogar', 1500000),
  (8, 3, 'Diseño de sistemas, tomo 1', 'libros', 2800000),
  (9, 3, 'SQL para curiosos', 'libros', 1900000),
  (10, 4, 'Pelota de fútbol', 'deportes', 2100000),
  (11, 4, 'Mat de yoga', 'deportes', 1600000),
  (12, 4, 'Zapatillas de running', 'deportes', 9800000);

INSERT INTO orders (id, customer_id, status, created_at) VALUES
  (1, 1, 'delivered', '2026-10-02 13:00+00'),
  (2, 2, 'delivered', '2026-10-03 18:20+00'),
  (3, 3, 'delivered', '2026-10-05 10:05+00'),
  (4, 4, 'cancelled', '2026-10-06 11:40+00'),
  (5, 5, 'delivered', '2026-10-08 21:15+00'),
  (6, 6, 'refunded', '2026-10-10 09:30+00'),
  (7, 7, 'delivered', '2026-10-12 16:45+00'),
  (8, 8, 'delivered', '2026-10-15 12:00+00'),
  (9, 9, 'shipped', '2026-10-20 19:10+00'),
  (10, 10, 'delivered', '2026-10-22 08:50+00'),
  (11, 11, 'shipped', '2026-10-28 14:30+00'),
  (12, 12, 'delivered', '2026-11-01 17:00+00'),
  (13, 1, 'shipped', '2026-11-03 10:25+00'),
  (14, 3, 'paid', '2026-11-10 22:40+00'),
  (15, 5, 'shipped', '2026-11-05 15:55+00'),
  (16, 2, 'cancelled', '2026-11-12 13:35+00'),
  (17, 7, 'pending', '2026-11-14 20:00+00'),
  (18, 9, 'delivered', '2026-10-25 11:15+00');

-- Cada ítem guarda el precio del producto al momento de la compra.
INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
SELECT v.order_id, v.product_id, v.quantity, p.price_cents
FROM (VALUES
  (1, 1, 1), (1, 3, 2),
  (2, 8, 1), (2, 9, 1),
  (3, 5, 1),
  (4, 12, 1),
  (5, 2, 1), (5, 11, 2),
  (6, 12, 1),
  (7, 4, 2),
  (8, 10, 3),
  (9, 6, 4), (9, 7, 1),
  (10, 1, 1),
  (11, 12, 1), (11, 11, 1),
  (12, 9, 2),
  (13, 2, 1),
  (14, 5, 1), (14, 6, 2),
  (15, 8, 1),
  (16, 3, 1),
  (17, 10, 1),
  (18, 1, 2)
) AS v (order_id, product_id, quantity)
JOIN products p ON p.id = v.product_id;

-- Un pago por cada pedido cobrado (el reembolsado también se cobró), diez minutos después de crearlo. El pedido 17
-- todavía espera la confirmación del pago.
INSERT INTO payments (order_id, provider, external_id, amount_cents, paid_at)
SELECT o.id, 'pasarela', 'pay_' || o.id, SUM(oi.quantity * oi.unit_price_cents), o.created_at + interval '10 minutes'
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status NOT IN ('pending', 'cancelled')
GROUP BY o.id, o.created_at
ORDER BY o.id;

INSERT INTO shipments (id, order_id, carrier, shipped_at, promised_by) VALUES
  (1, 1, 'Correo Rápido', '2026-10-03', '2026-10-07'),
  (2, 2, 'Envíos del Sur', '2026-10-04', '2026-10-09'),
  (3, 3, 'Correo Rápido', '2026-10-06', '2026-10-10'),
  (4, 5, 'MotoExpress', '2026-10-09', '2026-10-11'),
  (5, 7, 'Envíos del Sur', '2026-10-13', '2026-10-18'),
  (6, 8, 'Correo Rápido', '2026-10-16', '2026-10-20'),
  (7, 9, 'Envíos del Sur', '2026-10-21', '2026-10-26'),
  (8, 10, 'MotoExpress', '2026-10-23', '2026-10-25'),
  (9, 11, 'Correo Rápido', '2026-10-29', '2026-11-03'),
  (10, 12, 'Envíos del Sur', '2026-11-02', '2026-11-07'),
  (11, 13, 'MotoExpress', '2026-11-04', '2026-11-06'),
  (12, 15, 'Correo Rápido', '2026-11-06', '2026-11-18'),
  (13, 18, 'Envíos del Sur', '2026-10-26', '2026-10-31');

-- Todos los envíos se retiran el día de despacho y están en tránsito al día siguiente…
INSERT INTO shipment_events (shipment_id, status, occurred_at)
SELECT s.id, e.status, (s.shipped_at + e.day_offset)::timestamp AT TIME ZONE 'UTC' + e.at_time
FROM shipments s
CROSS JOIN (VALUES ('picked_up', 0, interval '10 hours'), ('in_transit', 1, interval '8 hours'))
  AS e (status, day_offset, at_time)
ORDER BY s.id, e.day_offset;

-- …y los entregados salen a reparto y se entregan el día de entrega. El 9 tuvo una visita fallida y sigue sin entregar.
INSERT INTO shipment_events (shipment_id, status, occurred_at)
SELECT d.shipment_id, e.status, d.delivered_on::timestamp AT TIME ZONE 'UTC' + e.at_time
FROM (VALUES
  (1, DATE '2026-10-06'),
  (2, DATE '2026-10-11'),
  (3, DATE '2026-10-09'),
  (4, DATE '2026-10-11'),
  (5, DATE '2026-10-20'),
  (6, DATE '2026-10-19'),
  (8, DATE '2026-10-25'),
  (10, DATE '2026-11-06'),
  (13, DATE '2026-11-02')
) AS d (shipment_id, delivered_on)
CROSS JOIN (VALUES ('out_for_delivery', interval '8 hours'), ('delivered', interval '15 hours')) AS e (status, at_time)
ORDER BY d.shipment_id, e.at_time;

INSERT INTO shipment_events (shipment_id, status, occurred_at) VALUES
  (9, 'out_for_delivery', '2026-11-03 08:00+00'),
  (9, 'failed_attempt', '2026-11-03 18:00+00');

INSERT INTO reviews (product_id, customer_id, rating, created_at) VALUES
  (1, 1, 5, '2026-10-10'),
  (3, 1, 4, '2026-10-10'),
  (8, 2, 5, '2026-10-15'),
  (9, 2, 3, '2026-10-15'),
  (5, 3, 2, '2026-10-14'),
  (2, 5, 4, '2026-10-16'),
  (11, 5, 5, '2026-10-16'),
  (4, 7, 1, '2026-10-22'),
  (10, 8, 4, '2026-10-25'),
  (1, 10, 5, '2026-10-28'),
  (1, 9, 3, '2026-11-01'),
  (9, 12, 4, '2026-11-08');

INSERT INTO support_tickets (id, customer_id, order_id, priority, subject, created_at) VALUES
  (1, 4, 4, 'normal', 'Quiero cancelar el pedido', '2026-10-06 12:00+00'),
  (2, 7, 7, 'high', 'Producto dañado', '2026-10-21 10:00+00'),
  (3, 9, 9, 'high', 'El envío no avanza', '2026-10-28 09:00+00'),
  (4, 11, 11, 'high', 'Visita fallida del transportista', '2026-11-04 08:30+00'),
  (5, 6, 6, 'normal', 'Estado del reembolso', '2026-10-15 16:00+00'),
  (6, 1, 13, 'low', 'Cambiar la dirección de entrega', '2026-11-04 11:00+00'),
  (7, 3, 14, 'low', 'Necesito factura A', '2026-11-11 09:00+00'),
  (8, 12, 12, 'normal', 'Consulta sobre la garantía', '2026-11-08 14:00+00');

INSERT INTO ticket_messages (ticket_id, author, sent_at) VALUES
  (1, 'customer', '2026-10-06 12:00+00'),
  (1, 'agent', '2026-10-06 13:30+00'),
  (2, 'customer', '2026-10-21 10:00+00'),
  (2, 'agent', '2026-10-21 16:00+00'),
  (2, 'customer', '2026-10-21 17:00+00'),
  (2, 'agent', '2026-10-21 17:20+00'),
  (3, 'customer', '2026-10-28 09:00+00'),
  (3, 'agent', '2026-10-28 10:15+00'),
  (4, 'customer', '2026-11-04 08:30+00'),
  (4, 'customer', '2026-11-04 14:00+00'),
  (5, 'customer', '2026-10-15 16:00+00'),
  (5, 'agent', '2026-10-16 10:00+00'),
  (6, 'customer', '2026-11-04 11:00+00'),
  (6, 'agent', '2026-11-05 09:00+00'),
  (7, 'customer', '2026-11-11 09:00+00'),
  (8, 'customer', '2026-11-08 14:00+00'),
  (8, 'agent', '2026-11-08 15:00+00');

INSERT INTO rooms (id, hotel, room_number, capacity) VALUES
  (1, 'Hotel Bahía', '101', 2),
  (2, 'Hotel Bahía', '102', 2),
  (3, 'Hotel Bahía', '201', 4),
  (4, 'Posada del Cerro', 'A', 2),
  (5, 'Posada del Cerro', 'B', 3),
  (6, 'Posada del Cerro', 'C', 4),
  (7, 'Posada del Cerro', 'D', 1);

INSERT INTO room_bookings (id, room_id, guest_name, check_in, check_out, status) VALUES
  (1, 1, 'Paula Ríos', '2026-12-18', '2026-12-21', 'confirmed'),
  (2, 2, 'Tomás Lee', '2026-12-23', '2026-12-26', 'confirmed'),
  (3, 3, 'Familia Paz', '2026-12-15', '2026-12-20', 'confirmed'),
  (4, 4, 'Sofía Ibarra', '2026-12-21', '2026-12-22', 'confirmed'),
  (5, 5, 'Marcos Gil', '2026-12-19', '2026-12-24', 'cancelled'),
  (6, 6, 'Lara Méndez', '2026-12-10', '2026-12-30', 'confirmed'),
  (7, 2, 'Iván Soto', '2026-12-01', '2026-12-05', 'confirmed');
