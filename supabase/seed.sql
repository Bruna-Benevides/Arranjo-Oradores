-- Dados fictícios apenas para validar a interface. Remova-os depois dos testes.
-- PIN padrão inicial: 1234 (PBKDF2-SHA256, 120 mil iterações).

insert into public.congregacoes (id, nome, endereco, dia_reuniao, horario, google_maps_url, observacoes, is_local)
values
  ('10000000-0000-4000-8000-000000000001', '[EXEMPLO] Congregação Local', '[EXEMPLO] Rua de teste, 100', 'Domingo', '9h', 'https://maps.google.com/', '[EXEMPLO] Congregação local', true),
  ('10000000-0000-4000-8000-000000000002', '[EXEMPLO] Congregação Norte', '[EXEMPLO] Avenida de teste, 200', 'Sábado', '18h', 'https://maps.google.com/', '[EXEMPLO] Congregação participante', false),
  ('10000000-0000-4000-8000-000000000003', '[EXEMPLO] Congregação Sul', '[EXEMPLO] Praça de teste, 300', 'Domingo', '10h', 'https://maps.google.com/', '[EXEMPLO] Congregação participante', false)
on conflict (id) do nothing;

insert into public.irmaos (id, nome, congregacao_id, telefone, observacoes)
values
  ('20000000-0000-4000-8000-000000000001', '[EXEMPLO] Orador Local', '10000000-0000-4000-8000-000000000001', '(11) 90000-0001', '[EXEMPLO] Irmão da congregação local'),
  ('20000000-0000-4000-8000-000000000002', '[EXEMPLO] Orador Norte', '10000000-0000-4000-8000-000000000002', '(11) 90000-0002', '[EXEMPLO] Irmão de outra congregação'),
  ('20000000-0000-4000-8000-000000000003', '[EXEMPLO] Orador Sul', '10000000-0000-4000-8000-000000000003', '(11) 90000-0003', '[EXEMPLO] Irmão de outra congregação')
on conflict (id) do nothing;

insert into public.discursos (numero, tema)
values
  (9001, '[EXEMPLO] Tema de discurso 1'),
  (9002, '[EXEMPLO] Tema de discurso 2'),
  (9003, '[EXEMPLO] Tema de discurso 3'),
  (9004, '[EXEMPLO] Tema de discurso 4'),
  (9005, '[EXEMPLO] Tema de discurso 5')
on conflict (numero) do nothing;

insert into public.canticos (numero, tema)
values
  (9001, '[EXEMPLO] Tema de cântico 1'),
  (9002, '[EXEMPLO] Tema de cântico 2'),
  (9003, '[EXEMPLO] Tema de cântico 3'),
  (9004, '[EXEMPLO] Tema de cântico 4'),
  (9005, '[EXEMPLO] Tema de cântico 5')
on conflict (numero) do nothing;

insert into public.configuracoes (chave, valor)
values (
  'observacoes_relatorio',
  E'Qualquer imprevisto ou eventual mudança, por favor me contate o mais breve possível.\nPara envio das informações como cântico e imagens: **[EXEMPLO] Nome e telefone**'
)
on conflict (chave) do nothing;

insert into public.acesso_pin (id, pin_hash, pin_salt, tentativas_falhas, bloqueado_ate)
values (
  1,
  '36ad82d3cf77d03d9a5afda87c3809499c37c488397f74a41fa34ea4b5348036',
  'db3edd9a4cea35311cb182510680293e',
  0,
  null
)
on conflict (id) do nothing;
