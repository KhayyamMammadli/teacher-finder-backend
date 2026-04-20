-- Add lat/lng columns to teachers table for map-based search
alter table teachers
  add column if not exists lat double precision default null,
  add column if not exists lng double precision default null;

-- Index for geo queries
create index if not exists idx_teachers_lat_lng on teachers (lat, lng)
  where lat is not null and lng is not null;
