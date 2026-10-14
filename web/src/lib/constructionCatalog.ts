/**
 * Real-time Indian Construction Market Rates Catalog (2024–2026)
 * Benchmark pricing reflecting current market conditions in Karnataka & South India.
 * Currency: INR (₹)
 */

export interface CatalogMaterial {
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  gstPercent: number;
  description: string;
}

export interface CatalogWorkerRole {
  roleName: string;
  skill: string;
  dailyWage: number;
  phone?: string;
  description: string;
}

export interface CatalogExpense {
  title: string;
  category: "material" | "labour" | "equipment" | "transport" | "food" | "misc";
  amount: number;
  gstPercent: number;
  description: string;
}

export const REAL_TIME_MATERIALS: CatalogMaterial[] = [
  {
    name: "Cement (OPC 53 Grade - 50kg)",
    category: "Structural",
    unit: "bag",
    unitCost: 390,
    gstPercent: 28,
    description: "High-grade 53 OPC cement for structural columns, beams & slabs",
  },
  {
    name: "TMT Rebar (Fe 550D / 500D)",
    category: "Structural",
    unit: "kg",
    unitCost: 68,
    gstPercent: 18,
    description: "Thermo-mechanically treated corrosion-resistant steel rebar",
  },
  {
    name: "M-Sand (Manufactured Sand - Concreting)",
    category: "Aggregates",
    unit: "ton",
    unitCost: 1650,
    gstPercent: 5,
    description: "Graded stone manufactured sand for reinforced concrete",
  },
  {
    name: "P-Sand (Plastering Sand)",
    category: "Aggregates",
    unit: "ton",
    unitCost: 1850,
    gstPercent: 5,
    description: "Fine washed manufactured sand for wall and ceiling plastering",
  },
  {
    name: "Coarse Aggregate 20mm (Granite Jelly)",
    category: "Aggregates",
    unit: "ton",
    unitCost: 1250,
    gstPercent: 5,
    description: "Crushed granite stone aggregate for RCC work",
  },
  {
    name: "Coarse Aggregate 40mm",
    category: "Aggregates",
    unit: "ton",
    unitCost: 1150,
    gstPercent: 5,
    description: "Granite aggregate for mass concrete & foundation base",
  },
  {
    name: "Red Clay Wirecut Bricks",
    category: "Masonry",
    unit: "piece",
    unitCost: 11,
    gstPercent: 12,
    description: "Standard kiln-burnt clay bricks for masonry walls",
  },
  {
    name: "Solid Concrete Blocks (6 inch)",
    category: "Masonry",
    unit: "piece",
    unitCost: 44,
    gstPercent: 12,
    description: "Precast dense concrete blocks for external and partition walls",
  },
  {
    name: "Solid Concrete Blocks (8 inch)",
    category: "Masonry",
    unit: "piece",
    unitCost: 52,
    gstPercent: 12,
    description: "Heavy-duty load-bearing concrete blocks",
  },
  {
    name: "Ready Mix Concrete (RMC M25 Grade)",
    category: "Structural",
    unit: "cu.m",
    unitCost: 4600,
    gstPercent: 18,
    description: "Automated batch plant design mix concrete delivered via transit mixer",
  },
  {
    name: "Steel Binding Wire (18 Gauge)",
    category: "Structural",
    unit: "kg",
    unitCost: 82,
    gstPercent: 18,
    description: "Annealed flexible steel wire for tying rebar reinforcement",
  },
  {
    name: "Waterproofing Chemical (Integral Liquid)",
    category: "Chemicals",
    unit: "litre",
    unitCost: 160,
    gstPercent: 18,
    description: "Liquid waterproofing admixture for concrete and mortar",
  },
  {
    name: "Exterior Acrylic Emulsion Paint",
    category: "Finishing",
    unit: "litre",
    unitCost: 320,
    gstPercent: 18,
    description: "Weatherproof exterior architectural emulsion paint",
  },
  {
    name: "Interior Wall Primer & Putty",
    category: "Finishing",
    unit: "litre",
    unitCost: 180,
    gstPercent: 18,
    description: "Water-based wall primer for masonry plaster",
  },
  {
    name: "Vitrified Floor Tiles (2x2 ft)",
    category: "Flooring",
    unit: "sq.ft",
    unitCost: 65,
    gstPercent: 18,
    description: "Double charge glazed vitrified floor tiles",
  },
  {
    name: "Granite Slab (Kitchen & Staircase)",
    category: "Flooring",
    unit: "sq.ft",
    unitCost: 155,
    gstPercent: 18,
    description: "18mm polished South Indian black/grey granite slab",
  },
  {
    name: "CPVC Plumbing Pipe (1 inch - 10ft)",
    category: "Plumbing",
    unit: "piece",
    unitCost: 340,
    gstPercent: 18,
    description: "Chlorinated PVC hot/cold water supply pressure pipe",
  },
  {
    name: "PVC Drainage Pipe (4 inch - 10ft)",
    category: "Plumbing",
    unit: "piece",
    unitCost: 520,
    gstPercent: 18,
    description: "Rigid PVC pipe for site drainage and sanitary disposal",
  },
  {
    name: "Copper FR Wire (1.5 sq mm - 90m coil)",
    category: "Electrical",
    unit: "coil",
    unitCost: 1750,
    gstPercent: 18,
    description: "Flame-retardant multi-strand copper internal conduit wiring",
  },
  {
    name: "Copper FR Wire (2.5 sq mm - 90m coil)",
    category: "Electrical",
    unit: "coil",
    unitCost: 2650,
    gstPercent: 18,
    description: "Power plug and AC circuitry copper wiring coil",
  },
  {
    name: "Sal / Hardwood Centering Timber",
    category: "Carpentry",
    unit: "cft",
    unitCost: 2100,
    gstPercent: 18,
    description: "Structural lumber for centering, scaffolding & formwork",
  },
];

export const REAL_TIME_WORKERS: CatalogWorkerRole[] = [
  {
    roleName: "Head Mason / Maistry (ಮೇಸ್ತ್ರಿ)",
    skill: "Site Supervision & Masonry Lead",
    dailyWage: 1100,
    description: "Lead site mason responsible for alignment, levels, and team supervision",
  },
  {
    roleName: "Skilled Mason (ಗಾರೆ ಕೆಲಸಗಾರ)",
    skill: "Brickwork & Plastering",
    dailyWage: 900,
    description: "Master bricklayer, blockwork & smooth wall plastering",
  },
  {
    roleName: "Centering Carpenter (ಬಡಗಿ)",
    skill: "Formwork & Centering",
    dailyWage: 900,
    description: "Slab shuttering, column box preparation, and formwork carpentry",
  },
  {
    roleName: "Bar Bender (ಕಬ್ಬಿಣದ ಕೆಲಸಗಾರ)",
    skill: "Steel Rebar Bending & Fixing",
    dailyWage: 900,
    description: "Rebar cutting, bending according to structural schedules, and cage tying",
  },
  {
    roleName: "Electrician (ವಿದ್ಯುತ್ ತಜ್ಞ)",
    skill: "Electrical Conduit & Cabling",
    dailyWage: 850,
    description: "Conduit piping in slabs, distribution board installation & wiring",
  },
  {
    roleName: "Plumber (ಪ್ಲಂಬರ್)",
    skill: "Plumbing & Sanitary Lines",
    dailyWage: 850,
    description: "Water supply lines, sanitary pipes, fittings & leakage testing",
  },
  {
    roleName: "Painter (ಬಣ್ಣಗಾರ)",
    skill: "Surface Finishing & Painting",
    dailyWage: 800,
    description: "Wall putty application, primer coating, and texture painting",
  },
  {
    roleName: "Male Site Helper (ಕೂಲಿ - ಪುರುಷ)",
    skill: "Material Handling & Mortar Mixing",
    dailyWage: 650,
    description: "Carrying cement, concrete mixing, heavy block transport",
  },
  {
    roleName: "Female Site Helper (ಕೂಲಿ - ಮಹಿಳೆ)",
    skill: "Curing & Site Assistance",
    dailyWage: 550,
    description: "Water curing of walls & slabs, cleaning, light material handling",
  },
];

export const REAL_TIME_EXPENSES: CatalogExpense[] = [
  {
    title: "JCB Excavator Rental (8 Hours / 1 Day)",
    category: "equipment",
    amount: 12000,
    gstPercent: 18,
    description: "Site clearing, foundation basement digging, and trenching",
  },
  {
    title: "Concrete Mixer Machine Rental (Daily)",
    category: "equipment",
    amount: 1200,
    gstPercent: 18,
    description: "One bag diesel/electric concrete mixer machine daily rental",
  },
  {
    title: "Sand / Aggregate Tipper Truck Freight",
    category: "transport",
    amount: 3500,
    gstPercent: 5,
    description: "Quarry to site transportation per 10-wheeler tipper trip",
  },
  {
    title: "Construction Water Tanker (6000 Litres)",
    category: "misc",
    amount: 900,
    gstPercent: 0,
    description: "Supplying non-potable water for concrete mixing and brick curing",
  },
  {
    title: "Daily Labour Bhatta & Refreshments",
    category: "food",
    amount: 1500,
    gstPercent: 0,
    description: "Tea, snacks, and daily allowance for on-site workforce",
  },
  {
    title: "Steel Shuttering Sheets Rental (Weekly)",
    category: "equipment",
    amount: 6500,
    gstPercent: 18,
    description: "Steel scaffolding props and shuttering plates weekly rental",
  },
];

export const DEFAULT_PROJECT_BUDGET = 4500000; // ₹45 Lakhs (typical 2,000 sq ft residential duplex)

