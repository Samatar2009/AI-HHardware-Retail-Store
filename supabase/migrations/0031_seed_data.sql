-- loyalty_tiers
INSERT INTO loyalty_tiers (tier_name, tier_name_so, min_lifetime_points, discount_percentage)
VALUES
  ('bronze', 'Naxaas', 0, 2.00),
  ('silver', 'Lacag', 500, 5.00),
  ('gold', 'Dahab', 2000, 10.00);

-- exchange_rates (set_by left NULL — no admin profile exists yet; will be
-- set again by the real admin once they sign in and Phase 7 settings exist)
INSERT INTO exchange_rates (usd_to_slsh_rate, set_by)
VALUES (8500.00, NULL);

-- locations — two Borama branches with distinctive, Somaliland-fitting names.
-- "Barwaaqo" (prosperity/abundance) and "Horumar" (progress/development) are
-- common, respected words in Somali business naming.
DO $$
DECLARE
  loc1_id UUID;
  loc2_id UUID;
BEGIN
  INSERT INTO locations (name_en, name_so, address, phone)
  VALUES ('Barwaaqo Hardware — Harowo Branch', 'Qalabka Barwaaqo — Laanta Harowo',
          'Behind Harowo Mosque, in front of Adenninteen Store, Borama, Somaliland',
          '+252638315010')
  RETURNING id INTO loc1_id;

  INSERT INTO locations (name_en, name_so, address, phone)
  VALUES ('Horumar Hardware — Rays Branch', 'Qalabka Horumar — Laanta Rays',
          'In front of Rays Hotel, Borama, Somaliland',
          '+252639361339')
  RETURNING id INTO loc2_id;

  -- location_hours: Saturday–Thursday 8:00–18:00, Friday with prayer break
  -- (day_of_week: 0=Sunday ... 6=Saturday)
  INSERT INTO location_hours (location_id, day_of_week, open_time, close_time, is_closed, has_prayer_break, prayer_start, prayer_end)
  SELECT loc_id, dow, '08:00', '18:00', false,
    (dow = 5), -- Friday
    CASE WHEN dow = 5 THEN '13:00'::time ELSE NULL END,
    CASE WHEN dow = 5 THEN '14:30'::time ELSE NULL END
  FROM (VALUES (loc1_id), (loc2_id)) AS locs(loc_id)
  CROSS JOIN generate_series(0, 6) AS dow;

  -- mobile_money_settings: Zaad uses the Rays branch number (also its phone);
  -- eDahab/EVC Plus/Sahal share the placeholder merchant number for now.
  INSERT INTO mobile_money_settings (location_id, provider, merchant_number, instructions_en, instructions_so, is_active)
  SELECT loc_id, provider, merchant_number, instructions_en, instructions_so, true
  FROM (VALUES (loc1_id), (loc2_id)) AS locs(loc_id)
  CROSS JOIN (VALUES
    ('zaad', '639361339', 'Send the exact amount to this Zaad number, then tap "I Have Sent the Payment" and show staff your order number.', 'Lacagta saxda ah u dir lambarkan Zaad ah, kadibna taabo "Lacagta waan diray" oo tus shaqaalaha lambarka dalabkaaga.'),
    ('edahab', '658315010', 'Send the exact amount to this eDahab number, then tap "I Have Sent the Payment" and show staff your order number.', 'Lacagta saxda ah u dir lambarkan eDahab ah, kadibna taabo "Lacagta waan diray" oo tus shaqaalaha lambarka dalabkaaga.'),
    ('evc_plus', '658315010', 'Send the exact amount to this EVC Plus number, then tap "I Have Sent the Payment" and show staff your order number.', 'Lacagta saxda ah u dir lambarkan EVC Plus ah, kadibna taabo "Lacagta waan diray" oo tus shaqaalaha lambarka dalabkaaga.'),
    ('sahal', '658315010', 'Send the exact amount to this Sahal number, then tap "I Have Sent the Payment" and show staff your order number.', 'Lacagta saxda ah u dir lambarkan Sahal ah, kadibna taabo "Lacagta waan diray" oo tus shaqaalaha lambarka dalabkaaga.')
  ) AS providers(provider, merchant_number, instructions_en, instructions_so);
END $$;
