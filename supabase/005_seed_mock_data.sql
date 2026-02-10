-- ============================================================
-- YENDI - 005_seed_mock_data.sql
-- Données de test pour développement
-- Exécuter APRÈS 004_seed_superadmin.sql
-- ============================================================

-- ============================================================
-- Agences de test
-- ============================================================
INSERT INTO public.agencies (id, name, siret_number, website, address, city, country_code, color, plan, commission_rate, status) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Horizon Express', '123456789', 'https://horizon-express.ci', '12 Rue du Commerce', 'Abidjan', 'CI', '#f26522', 'standard', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000002', 'Yamousso Transport', NULL, NULL, 'Avenue de la Paix', 'Yamoussoukro', 'CI', '#9ca3af', 'standard', 10.00, 'inactive'),
  ('a1000000-0000-0000-0000-000000000003', 'Golden Coast Lines', '987654321', 'https://goldencoast.ci', 'Boulevard Maritime', 'San-Pédro', 'CI', '#22c55e', 'premium', 8.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000004', 'Savane Travel', NULL, NULL, 'Quartier Résidentiel', 'Korhogo', 'CI', '#ef4444', 'standard', 10.00, 'suspendu'),
  ('a1000000-0000-0000-0000-000000000005', 'Swift Babi', '456789123', 'https://swiftbabi.ci', '8 Avenue Houphouët', 'Abidjan', 'CI', '#f59e0b', 'premium', 8.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000006', 'Azure Voyages', '111222333', 'https://azure-voyages.fr', '15 Rue de Rivoli', 'Paris', 'FR', '#3b82f6', 'standard', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000007', 'Atlas Horizons', '444555666', 'https://atlas-horizons.fr', '22 Place Bellecour', 'Lyon', 'FR', '#8b5cf6', 'standard', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000008', 'Yendi Travel Beta', NULL, NULL, 'Rue Neuve 45', 'Bruxelles', 'BE', '#06b6d4', 'standard', 10.00, 'configuration'),
  ('a1000000-0000-0000-0000-000000000009', 'Safari Express', '777888999', NULL, 'Route de Bassam', 'Abidjan', 'CI', '#22c55e', 'premium', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000010', 'Ivoire Transport', NULL, NULL, '5 Rue du Plateau', 'Abidjan', 'CI', '#6366f1', 'standard', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000011', 'Globo Bus', '111000222', 'https://globobus.ci', 'Zone Industrielle', 'Abidjan', 'CI', '#f59e0b', 'standard', 10.00, 'operationnel'),
  ('a1000000-0000-0000-0000-000000000012', 'Dakar Express', NULL, NULL, 'Avenue Cheikh Anta Diop', 'Dakar', 'SN', '#ec4899', 'standard', 10.00, 'operationnel')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Données financières mock (derniers mois)
-- ============================================================
INSERT INTO public.financial_records (agency_id, month, year, ca_brut, commission_rate, commission_amount, trips_count, reversement_status) VALUES
  -- Horizon Express
  ('a1000000-0000-0000-0000-000000000001', 1, 2026, 42000000, 10.00, 4200000, 380, 'paye'),
  ('a1000000-0000-0000-0000-000000000001', 2, 2026, 54200500, 10.00, 5420050, 432, 'paye'),
  -- Yamousso Transport
  ('a1000000-0000-0000-0000-000000000002', 1, 2026, 5000000, 10.00, 500000, 45, 'paye'),
  ('a1000000-0000-0000-0000-000000000002', 2, 2026, 0, 10.00, 0, 0, 'en_attente'),
  -- Golden Coast Lines
  ('a1000000-0000-0000-0000-000000000003', 1, 2026, 22000000, 8.00, 1760000, 195, 'paye'),
  ('a1000000-0000-0000-0000-000000000003', 2, 2026, 28000000, 8.00, 2240000, 248, 'paye'),
  -- Savane Travel (suspendu, dette)
  ('a1000000-0000-0000-0000-000000000004', 1, 2026, 3000000, 10.00, 300000, 28, 'bloque'),
  ('a1000000-0000-0000-0000-000000000004', 2, 2026, 0, 10.00, 0, 0, 'bloque'),
  -- Swift Babi
  ('a1000000-0000-0000-0000-000000000005', 1, 2026, 7500000, 8.00, 600000, 68, 'paye'),
  ('a1000000-0000-0000-0000-000000000005', 2, 2026, 8200000, 8.00, 656000, 74, 'paye'),
  -- Azure Voyages
  ('a1000000-0000-0000-0000-000000000006', 1, 2026, 18000000, 10.00, 1800000, 162, 'paye'),
  ('a1000000-0000-0000-0000-000000000006', 2, 2026, 20000000, 10.00, 2000000, 178, 'en_attente'),
  -- Atlas Horizons
  ('a1000000-0000-0000-0000-000000000007', 1, 2026, 12000000, 10.00, 1200000, 108, 'paye'),
  ('a1000000-0000-0000-0000-000000000007', 2, 2026, 14500000, 10.00, 1450000, 130, 'paye'),
  -- Safari Express
  ('a1000000-0000-0000-0000-000000000009', 1, 2026, 34000000, 10.00, 3400000, 270, 'paye'),
  ('a1000000-0000-0000-0000-000000000009', 2, 2026, 36150000, 10.00, 3615000, 285, 'en_attente'),
  -- Ivoire Transport
  ('a1000000-0000-0000-0000-000000000010', 1, 2026, 20000000, 10.00, 2000000, 155, 'paye'),
  ('a1000000-0000-0000-0000-000000000010', 2, 2026, 19300000, 10.00, 1930000, 150, 'paye'),
  -- Globo Bus
  ('a1000000-0000-0000-0000-000000000011', 1, 2026, 8000000, 10.00, 800000, 76, 'paye'),
  ('a1000000-0000-0000-0000-000000000011', 2, 2026, 10500000, 10.00, 1050000, 98, 'bloque'),
  -- Dakar Express
  ('a1000000-0000-0000-0000-000000000012', 1, 2026, 11000000, 10.00, 1100000, 95, 'paye'),
  ('a1000000-0000-0000-0000-000000000012', 2, 2026, 13500000, 10.00, 1350000, 115, 'en_attente')
ON CONFLICT (agency_id, month, year) DO NOTHING;

-- ============================================================
-- Quelques trajets de test
-- ============================================================
INSERT INTO public.trips (agency_id, departure, destination, amount, passengers_count, trip_date, status) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Abidjan', 'Yamoussoukro', 15000, 45, '2026-02-01', 'termine'),
  ('a1000000-0000-0000-0000-000000000001', 'Abidjan', 'Bouaké', 12000, 38, '2026-02-02', 'termine'),
  ('a1000000-0000-0000-0000-000000000001', 'Abidjan', 'San-Pédro', 18000, 32, '2026-02-03', 'termine'),
  ('a1000000-0000-0000-0000-000000000003', 'San-Pédro', 'Abidjan', 18000, 28, '2026-02-01', 'termine'),
  ('a1000000-0000-0000-0000-000000000003', 'San-Pédro', 'Sassandra', 8000, 15, '2026-02-02', 'termine'),
  ('a1000000-0000-0000-0000-000000000005', 'Abidjan', 'Grand-Bassam', 5000, 20, '2026-02-01', 'termine'),
  ('a1000000-0000-0000-0000-000000000005', 'Abidjan', 'Bingerville', 3000, 25, '2026-02-03', 'en_cours'),
  ('a1000000-0000-0000-0000-000000000009', 'Abidjan', 'Man', 25000, 42, '2026-02-02', 'termine'),
  ('a1000000-0000-0000-0000-000000000009', 'Abidjan', 'Daloa', 20000, 35, '2026-02-03', 'termine'),
  ('a1000000-0000-0000-0000-000000000010', 'Abidjan', 'Gagnoa', 15000, 30, '2026-02-01', 'termine'),
  ('a1000000-0000-0000-0000-000000000012', 'Dakar', 'Saint-Louis', 12000, 28, '2026-02-01', 'termine'),
  ('a1000000-0000-0000-0000-000000000012', 'Dakar', 'Thiès', 8000, 22, '2026-02-02', 'termine')
ON CONFLICT DO NOTHING;
