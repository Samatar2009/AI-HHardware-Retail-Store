-- Phase 5 test catalog data: 5 categories, 8 products, 15 variants, images,
-- and per-location inventory. Images use placehold.co (no API key, no
-- external dependency risk beyond image loading) since no real product
-- photography exists yet — swap for real Supabase Storage URLs later.

DO $$
DECLARE
  loc1_id UUID := 'aec25760-580e-4006-af29-716a28d308ac'; -- Barwaaqo (Harowo)
  loc2_id UUID := '924d8c9d-9613-4fbd-bfcc-5809719f9566'; -- Horumar (Rays)

  cat_power UUID := gen_random_uuid();
  cat_hand UUID := gen_random_uuid();
  cat_building UUID := gen_random_uuid();
  cat_plumbing UUID := gen_random_uuid();
  cat_electrical UUID := gen_random_uuid();

  p_drill UUID := gen_random_uuid();
  p_grinder UUID := gen_random_uuid();
  p_hammer UUID := gen_random_uuid();
  p_wrench UUID := gen_random_uuid();
  p_cement UUID := gen_random_uuid();
  p_rebar UUID := gen_random_uuid();
  p_pvc UUID := gen_random_uuid();
  p_bulb UUID := gen_random_uuid();

  v_drill_2ah UUID := gen_random_uuid();
  v_drill_4ah UUID := gen_random_uuid();
  v_grinder UUID := gen_random_uuid();
  v_hammer_wood UUID := gen_random_uuid();
  v_hammer_fiber UUID := gen_random_uuid();
  v_wrench UUID := gen_random_uuid();
  v_cement UUID := gen_random_uuid();
  v_rebar_6m UUID := gen_random_uuid();
  v_rebar_12m UUID := gen_random_uuid();
  v_pvc_3m UUID := gen_random_uuid();
  v_pvc_6m UUID := gen_random_uuid();
  v_bulb_warm UUID := gen_random_uuid();
  v_bulb_cool UUID := gen_random_uuid();
BEGIN
  -- Categories
  INSERT INTO categories (id, name_en, name_so, sort_order) VALUES
    (cat_power, 'Power Tools', 'Qalabka Korontada', 1),
    (cat_hand, 'Hand Tools', 'Qalabka Gacanta', 2),
    (cat_building, 'Building Materials', 'Alaabta Dhismaha', 3),
    (cat_plumbing, 'Plumbing', 'Qodobka Biyaha', 4),
    (cat_electrical, 'Electrical', 'Korontada', 5);

  -- Products
  INSERT INTO products (id, category_id, sku_base, name_en, name_so, description_en, description_so, brand, unit, cost_price_slsh, tags, is_featured) VALUES
    (p_drill, cat_power, 'PWR-DRL-001', '18V Cordless Drill', 'Miishaan Daloolin 18V oo Korontadeed',
      'Powerful 18V cordless drill with variable speed trigger and LED work light. Includes carry case.',
      'Miishaan daloolin 18V ah oo xoog leh, leh xawaare kala duwan iyo iftiin LED ah. Waxaa lagu daray shandad qaadis.',
      'BoramaTools', 'each', 600000, ARRAY['power tools','drill','cordless'], true),
    (p_grinder, cat_power, 'PWR-GRD-002', '850W Angle Grinder', 'Nadiifiye Xagal 850W',
      'Heavy-duty 850W angle grinder for cutting and grinding metal, tile, and concrete.',
      'Nadiifiye xagal ah oo 850W ah, loo isticmaalo jarista iyo nadiifinta bir, taail, iyo baaskiil.',
      'BoramaTools', 'each', 380000, ARRAY['power tools','grinder'], true),
    (p_hammer, cat_hand, 'HND-HMR-001', '16oz Claw Hammer', 'Dubbe 16oz',
      'Classic 16oz claw hammer for framing, nailing, and general carpentry work.',
      'Dubbe caadi ah oo 16oz ah, loo isticmaalo qaab-dhismeedka, musmaarka, iyo shaqada alwaaxda guud.',
      'ForgeLine', 'each', 45000, ARRAY['hand tools','hammer'], false),
    (p_wrench, cat_hand, 'HND-WRN-001', 'Adjustable Wrench Set (3-piece)', 'Kayd Barafuun La Hagaajin Karo (3-xabbo)',
      'Set of 3 adjustable wrenches (6", 8", 10") with chrome-plated finish.',
      'Kayd ka kooban 3 barafuun oo la hagaajin karo (6", 8", 10") oo leh dhammaystir chrome ah.',
      'ForgeLine', 'set', 110000, ARRAY['hand tools','wrench'], false),
    (p_cement, cat_building, 'BLD-CEM-001', 'Portland Cement 50kg Bag', 'Sibidhka Portland 50kg',
      'Standard Portland cement, 50kg bag. Suitable for general construction and masonry.',
      'Sibidh Portland ah oo caadi ah, kiish 50kg ah. Ku habboon dhismaha guud iyo shaqada dhagaxa.',
      'Dahabshiil Cement', 'bag', 95000, ARRAY['building materials','cement'], true),
    (p_rebar, cat_building, 'BLD-RBR-001', 'Steel Rebar 12mm', 'Bir Rebar ah 12mm',
      'High-tensile steel reinforcement bar, 12mm diameter.',
      'Bir xoog badan oo lagu xoojiyo dhismaha, dhumucdiisu tahay 12mm.',
      'SteelCo', 'each', 32000, ARRAY['building materials','steel','rebar'], false),
    (p_pvc, cat_plumbing, 'PLM-PVC-001', 'PVC Pipe 4-inch', 'Tuubbo PVC ah 4-inji',
      'Durable PVC pipe, 4-inch diameter, for drainage and plumbing systems.',
      'Tuubbo PVC ah oo adkaysi leh, dhumucdiisu tahay 4-inji, loo isticmaalo nidaamka biyaha iyo qulqulka.',
      'AquaFlow', 'each', 50000, ARRAY['plumbing','pipe','pvc'], false),
    (p_bulb, cat_electrical, 'ELC-LED-001', '12W LED Bulb', 'Nalka LED 12W',
      'Energy-efficient 12W LED bulb, E27 base, 900 lumens.',
      'Nal LED ah oo tamar yar isticmaala, 12W, saldhig E27 ah, 900 lumens.',
      'BrightHome', 'each', 18000, ARRAY['electrical','led','bulb'], true);

  -- Variants
  INSERT INTO product_variants (id, product_id, sku, attributes, price_slsh, cost_price_slsh, image_url) VALUES
    (v_drill_2ah, p_drill, 'PWR-DRL-001-2AH', '{"battery": "2Ah"}', 850000, 600000, 'https://placehold.co/600x600/f97316/ffffff?text=Drill+2Ah'),
    (v_drill_4ah, p_drill, 'PWR-DRL-001-4AH', '{"battery": "4Ah"}', 1050000, 750000, NULL),
    (v_grinder, p_grinder, 'PWR-GRD-002-STD', '{}', 510000, 380000, 'https://placehold.co/600x600/f97316/ffffff?text=Angle+Grinder'),
    (v_hammer_wood, p_hammer, 'HND-HMR-001-WD', '{"handle": "Wood"}', 75000, 45000, 'https://placehold.co/600x600/f97316/ffffff?text=Hammer+Wood'),
    (v_hammer_fiber, p_hammer, 'HND-HMR-001-FG', '{"handle": "Fiberglass"}', 95000, 60000, NULL),
    (v_wrench, p_wrench, 'HND-WRN-001-SET', '{}', 170000, 110000, 'https://placehold.co/600x600/f97316/ffffff?text=Wrench+Set'),
    (v_cement, p_cement, 'BLD-CEM-001-50KG', '{}', 127500, 95000, 'https://placehold.co/600x600/f97316/ffffff?text=Cement+50kg'),
    (v_rebar_6m, p_rebar, 'BLD-RBR-001-6M', '{"length": "6m"}', 42500, 32000, 'https://placehold.co/600x600/f97316/ffffff?text=Rebar+6m'),
    (v_rebar_12m, p_rebar, 'BLD-RBR-001-12M', '{"length": "12m"}', 80000, 60000, NULL),
    (v_pvc_3m, p_pvc, 'PLM-PVC-001-3M', '{"length": "3m"}', 68000, 50000, 'https://placehold.co/600x600/f97316/ffffff?text=PVC+Pipe+3m'),
    (v_pvc_6m, p_pvc, 'PLM-PVC-001-6M', '{"length": "6m"}', 130000, 95000, NULL),
    (v_bulb_warm, p_bulb, 'ELC-LED-001-WARM', '{"color_temp": "Warm White"}', 25500, 18000, 'https://placehold.co/600x600/f97316/ffffff?text=LED+Warm'),
    (v_bulb_cool, p_bulb, 'ELC-LED-001-COOL', '{"color_temp": "Cool White"}', 25500, 18000, NULL);

  -- Product images (main image per product)
  INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text_en, alt_text_so, sort_order) VALUES
    (p_drill, 'https://placehold.co/600x600/f97316/ffffff?text=Drill', 'https://placehold.co/150x150/f97316/ffffff?text=Drill', '18V Cordless Drill', 'Miishaan Daloolin 18V', 0),
    (p_grinder, 'https://placehold.co/600x600/f97316/ffffff?text=Angle+Grinder', 'https://placehold.co/150x150/f97316/ffffff?text=Grinder', '850W Angle Grinder', 'Nadiifiye Xagal 850W', 0),
    (p_hammer, 'https://placehold.co/600x600/f97316/ffffff?text=Hammer', 'https://placehold.co/150x150/f97316/ffffff?text=Hammer', '16oz Claw Hammer', 'Dubbe 16oz', 0),
    (p_wrench, 'https://placehold.co/600x600/f97316/ffffff?text=Wrench+Set', 'https://placehold.co/150x150/f97316/ffffff?text=Wrench', 'Adjustable Wrench Set', 'Kayd Barafuun', 0),
    (p_cement, 'https://placehold.co/600x600/f97316/ffffff?text=Cement', 'https://placehold.co/150x150/f97316/ffffff?text=Cement', 'Portland Cement 50kg', 'Sibidhka Portland', 0),
    (p_rebar, 'https://placehold.co/600x600/f97316/ffffff?text=Rebar', 'https://placehold.co/150x150/f97316/ffffff?text=Rebar', 'Steel Rebar 12mm', 'Bir Rebar', 0),
    (p_pvc, 'https://placehold.co/600x600/f97316/ffffff?text=PVC+Pipe', 'https://placehold.co/150x150/f97316/ffffff?text=PVC', 'PVC Pipe 4-inch', 'Tuubbo PVC', 0),
    (p_bulb, 'https://placehold.co/600x600/f97316/ffffff?text=LED+Bulb', 'https://placehold.co/150x150/f97316/ffffff?text=LED', '12W LED Bulb', 'Nalka LED', 0);

  -- Inventory: every variant stocked at both locations
  INSERT INTO inventory (location_id, product_id, variant_id, quantity_on_hand, threshold, aisle_shelf)
  SELECT loc_id, product_id, variant_id, qty, threshold, aisle
  FROM (VALUES
    (v_drill_2ah, p_drill, 12, 3, 'A1-01'),
    (v_drill_4ah, p_drill, 8, 3, 'A1-01'),
    (v_grinder, p_grinder, 15, 4, 'A1-02'),
    (v_hammer_wood, p_hammer, 25, 5, 'B2-01'),
    (v_hammer_fiber, p_hammer, 18, 5, 'B2-01'),
    (v_wrench, p_wrench, 20, 5, 'B2-03'),
    (v_cement, p_cement, 3, 10, 'C1-01'),
    (v_rebar_6m, p_rebar, 40, 10, 'C2-01'),
    (v_rebar_12m, p_rebar, 0, 10, 'C2-01'),
    (v_pvc_3m, p_pvc, 22, 5, 'D1-02'),
    (v_pvc_6m, p_pvc, 14, 5, 'D1-02'),
    (v_bulb_warm, p_bulb, 60, 15, 'E1-01'),
    (v_bulb_cool, p_bulb, 55, 15, 'E1-01')
  ) AS v(variant_id, product_id, qty, threshold, aisle)
  CROSS JOIN (VALUES (loc1_id), (loc2_id)) AS locs(loc_id);
END $$;
