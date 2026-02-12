-- ============================================================
-- 017_create_drivers.sql - Table des chauffeurs
-- ============================================================

-- Table des chauffeurs (drivers)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'actif' CHECK (status IN ('actif', 'inactif', 'suspendu')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_drivers_agency ON drivers(agency_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- RLS (Row Level Security)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent voir les chauffeurs de leur agence
CREATE POLICY select_drivers_policy ON drivers
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Policy: Les admins peuvent créer des chauffeurs pour leur agence
CREATE POLICY insert_drivers_policy ON drivers
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Policy: Les admins peuvent modifier les chauffeurs de leur agence
CREATE POLICY update_drivers_policy ON drivers
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Policy: Les admins peuvent supprimer les chauffeurs de leur agence
CREATE POLICY delete_drivers_policy ON drivers
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_admins
      WHERE profile_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_drivers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_drivers_updated_at();

-- Ajouter une colonne driver_id dans scheduled_trips (nullable pour la rétrocompatibilité)
ALTER TABLE scheduled_trips 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Index pour optimiser la recherche
CREATE INDEX IF NOT EXISTS idx_scheduled_trips_driver ON scheduled_trips(driver_id);

-- Commentaires
COMMENT ON TABLE drivers IS 'Table des chauffeurs par agence';
COMMENT ON COLUMN drivers.agency_id IS 'Référence à l''agence';
COMMENT ON COLUMN drivers.first_name IS 'Prénom du chauffeur';
COMMENT ON COLUMN drivers.last_name IS 'Nom du chauffeur';
COMMENT ON COLUMN drivers.phone IS 'Numéro de téléphone du chauffeur';
COMMENT ON COLUMN drivers.status IS 'Statut: actif, inactif, suspendu';
