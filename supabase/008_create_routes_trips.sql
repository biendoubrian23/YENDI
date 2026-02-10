-- ============================================================
-- YENDI - 008_create_routes_trips.sql
-- Routes (lignes) et Trips (trajets planifiés) pour les agences
-- Contexte : Cameroun, villes camerounaises
-- ============================================================

-- ============================================================
-- TABLE: routes
-- Une "ligne" / "route" = un itinéraire fixe entre 2 villes
-- Ex: Douala → Yaoundé avec arrêts intermédiaires
-- ============================================================
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  -- Départ
  departure_city TEXT NOT NULL,           -- Douala, Yaoundé, Bafoussam...
  departure_location TEXT,                -- ex: "Gare routière de Bonabéri"

  -- Arrivée
  arrival_city TEXT NOT NULL,             -- Yaoundé, Douala, Bamenda...
  arrival_location TEXT,                  -- ex: "Gare routière de Mvan"

  -- Arrêts intermédiaires (correspondances)
  -- Format JSON : [{"city": "Nkongsamba", "location": "Centre-ville"}, ...]
  stops JSONB NOT NULL DEFAULT '[]',

  -- Statut de la route
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_agency ON public.routes(agency_id);
CREATE INDEX idx_routes_departure ON public.routes(departure_city);
CREATE INDEX idx_routes_arrival ON public.routes(arrival_city);
CREATE INDEX idx_routes_active ON public.routes(is_active);

-- ============================================================
-- TABLE: scheduled_trips
-- Un "trajet planifié" = une route + une date + un bus + prix + places
-- C'est CE qui apparaît quand on clique sur une date dans le calendrier
-- ============================================================
CREATE TABLE public.scheduled_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,

  -- Horaires
  departure_datetime TIMESTAMPTZ NOT NULL,
  arrival_datetime TIMESTAMPTZ NOT NULL,

  -- Chauffeur (texte libre pour le moment, sera lié à une table équipe plus tard)
  driver_name TEXT,

  -- Tarification
  base_price INTEGER NOT NULL DEFAULT 0,   -- Prix en FCFA

  -- Yield management (désactivé par défaut, prévu pour plus tard)
  yield_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Gestion des places
  total_seats INTEGER NOT NULL,            -- Capacité totale du bus (auto-rempli depuis le bus)
  available_seats_count INTEGER NOT NULL,  -- Nb de places mises en vente
  -- Les sièges sélectionnés (numéros) pour la vente
  -- Ex: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] → places de devant privilégiées
  available_seat_numbers INTEGER[] NOT NULL DEFAULT '{}',

  -- Statut du trajet
  status TEXT NOT NULL DEFAULT 'actif'
    CHECK (status IN ('actif', 'inactif', 'termine', 'annule')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strips_agency ON public.scheduled_trips(agency_id);
CREATE INDEX idx_strips_route ON public.scheduled_trips(route_id);
CREATE INDEX idx_strips_bus ON public.scheduled_trips(bus_id);
CREATE INDEX idx_strips_departure ON public.scheduled_trips(departure_datetime);
CREATE INDEX idx_strips_status ON public.scheduled_trips(status);
-- Index pour chercher les trajets par date (important pour le calendrier)
-- Pour filtrer par date on utilise l'index idx_strips_departure avec une requête range
-- Ex: WHERE departure_datetime >= '2026-02-10' AND departure_datetime < '2026-02-11'

-- ============================================================
-- TABLE: seat_reservations
-- Chaque place mise en ligne = 1 ligne ici
-- Quand un trajet est créé avec 10 places, on insère 10 lignes
-- ============================================================
CREATE TABLE public.seat_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_trip_id UUID NOT NULL REFERENCES public.scheduled_trips(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,         -- numéro du siège dans le bus

  -- Statut de la réservation
  status TEXT NOT NULL DEFAULT 'disponible'
    CHECK (status IN ('disponible', 'reserve', 'confirme', 'annule')),

  -- Info passager (rempli quand réservé via l'app mobile)
  passenger_name TEXT,
  passenger_phone TEXT,

  reserved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un siège ne peut être qu'une seule fois par trajet
  UNIQUE(scheduled_trip_id, seat_number)
);

CREATE INDEX idx_seatres_trip ON public.seat_reservations(scheduled_trip_id);
CREATE INDEX idx_seatres_status ON public.seat_reservations(status);

-- ============================================================
-- Triggers: updated_at automatique
-- ============================================================
CREATE TRIGGER on_routes_updated
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_scheduled_trips_updated
  BEFORE UPDATE ON public.scheduled_trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;

-- ROUTES : admin agence voit/gère ses routes
CREATE POLICY "Agency admins can view own routes"
  ON public.routes FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can insert own routes"
  ON public.routes FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can update own routes"
  ON public.routes FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can delete own routes"
  ON public.routes FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

-- SCHEDULED_TRIPS : admin agence voit/gère ses trajets
CREATE POLICY "Agency admins can view own scheduled_trips"
  ON public.scheduled_trips FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can insert own scheduled_trips"
  ON public.scheduled_trips FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can update own scheduled_trips"
  ON public.scheduled_trips FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can delete own scheduled_trips"
  ON public.scheduled_trips FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
    )
  );

-- SEAT_RESERVATIONS : visible par l'admin de l'agence du trajet
CREATE POLICY "Agency admins can view own seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips
      WHERE agency_id IN (
        SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agency admins can insert own seat_reservations"
  ON public.seat_reservations FOR INSERT
  WITH CHECK (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips
      WHERE agency_id IN (
        SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agency admins can update own seat_reservations"
  ON public.seat_reservations FOR UPDATE
  USING (
    scheduled_trip_id IN (
      SELECT id FROM public.scheduled_trips
      WHERE agency_id IN (
        SELECT agency_id FROM public.agency_admins WHERE profile_id = auth.uid()
      )
    )
  );

-- Superadmins voient tout
CREATE POLICY "Superadmins can view all routes"
  ON public.routes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "Superadmins can view all scheduled_trips"
  ON public.scheduled_trips FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "Superadmins can view all seat_reservations"
  ON public.seat_reservations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));
