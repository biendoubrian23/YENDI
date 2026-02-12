-- =====================================================
-- Migration 025 : Index de performance pour la recherche
-- =====================================================
-- Objectif : Optimiser les requêtes de recherche ILIKE
-- et les JOINs fréquents dans get_agency_reservations
-- quand il y aura des milliers de réservations
-- =====================================================

-- 1. Index trigram pour recherche ILIKE sur seat_reservations
-- (nécessite l'extension pg_trgm, déjà dispo sur Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index GIN trigram pour recherche rapide par nom/téléphone/ref
CREATE INDEX IF NOT EXISTS idx_seat_reservations_passenger_name_trgm
  ON public.seat_reservations USING gin (passenger_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_passenger_phone_trgm
  ON public.seat_reservations USING gin (passenger_phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_ticket_ref_trgm
  ON public.seat_reservations USING gin (ticket_ref gin_trgm_ops);

-- Index GIN trigram pour recherche dans booking_groups
CREATE INDEX IF NOT EXISTS idx_booking_groups_booked_by_name_trgm
  ON public.booking_groups USING gin (booked_by_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_booking_groups_booked_by_phone_trgm
  ON public.booking_groups USING gin (booked_by_phone gin_trgm_ops);

-- 2. Index composites pour les JOINs et filtres fréquents

-- Accélérer le filtre par agence + statut (utilisé dans TOUTES les requêtes réservations)
CREATE INDEX IF NOT EXISTS idx_scheduled_trips_agency_status
  ON public.scheduled_trips (agency_id, status);

-- Accélérer le filtre par date de départ
CREATE INDEX IF NOT EXISTS idx_scheduled_trips_departure_datetime
  ON public.scheduled_trips (departure_datetime);

-- Accélérer la jointure seat_reservations → scheduled_trips + filtre statut
CREATE INDEX IF NOT EXISTS idx_seat_reservations_trip_status
  ON public.seat_reservations (scheduled_trip_id, status);

-- Accélérer le tri par date de réservation (ORDER BY sr.reserved_at DESC)
CREATE INDEX IF NOT EXISTS idx_seat_reservations_reserved_at
  ON public.seat_reservations (reserved_at DESC);

-- 3. Index pour les clients (recherche wallet, bonus parrainage)
CREATE INDEX IF NOT EXISTS idx_clients_referral_code
  ON public.clients (referral_code);

CREATE INDEX IF NOT EXISTS idx_clients_referred_by
  ON public.clients (referred_by);

-- 4. Index pour wallet_transactions (historique par client)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client
  ON public.wallet_transactions (client_id, created_at DESC);
