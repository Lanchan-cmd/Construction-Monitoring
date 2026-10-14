/**
 * Seed Script: Real-Time Construction Rates & Workforce Data
 * Can be run via: node backend/seed_realtime_data.js [project_id]
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const envPath = path.resolve(__dirname, "../web/.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [k, v] = line.split("=");
      if (k?.trim() === "EXPO_PUBLIC_SUPABASE_URL") supabaseUrl = v?.trim();
      if (k?.trim() === "EXPO_PUBLIC_SUPABASE_ANON_KEY") supabaseKey = v?.trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REAL_TIME_MATERIALS = [
  { name: "Cement (OPC 53 Grade - 50kg)", category: "Structural", unit: "bag", unit_cost: 390, gst_percent: 28 },
  { name: "TMT Rebar (Fe 550D / 500D)", category: "Structural", unit: "kg", unit_cost: 68, gst_percent: 18 },
  { name: "M-Sand (Concreting)", category: "Aggregates", unit: "ton", unit_cost: 1650, gst_percent: 5 },
  { name: "P-Sand (Plastering)", category: "Aggregates", unit: "ton", unit_cost: 1850, gst_percent: 5 },
  { name: "Coarse Aggregate 20mm", category: "Aggregates", unit: "ton", unit_cost: 1250, gst_percent: 5 },
  { name: "Coarse Aggregate 40mm", category: "Aggregates", unit: "ton", unit_cost: 1150, gst_percent: 5 },
  { name: "Red Clay Wirecut Bricks", category: "Masonry", unit: "piece", unit_cost: 11, gst_percent: 12 },
  { name: "Solid Concrete Blocks (6 inch)", category: "Masonry", unit: "piece", unit_cost: 44, gst_percent: 12 },
  { name: "Solid Concrete Blocks (8 inch)", category: "Masonry", unit: "piece", unit_cost: 52, gst_percent: 12 },
  { name: "Ready Mix Concrete (RMC M25)", category: "Structural", unit: "cu.m", unit_cost: 4600, gst_percent: 18 },
  { name: "Steel Binding Wire (18 Gauge)", category: "Structural", unit: "kg", unit_cost: 82, gst_percent: 18 },
  { name: "Waterproofing Chemical", category: "Chemicals", unit: "litre", unit_cost: 160, gst_percent: 18 },
  { name: "Exterior Acrylic Emulsion Paint", category: "Finishing", unit: "litre", unit_cost: 320, gst_percent: 18 },
  { name: "Interior Wall Primer & Putty", category: "Finishing", unit: "litre", unit_cost: 180, gst_percent: 18 },
  { name: "Vitrified Floor Tiles (2x2 ft)", category: "Flooring", unit: "sq.ft", unit_cost: 65, gst_percent: 18 },
  { name: "Granite Slab (Kitchen & Stairs)", category: "Flooring", unit: "sq.ft", unit_cost: 155, gst_percent: 18 },
  { name: "CPVC Plumbing Pipe (1 inch - 10ft)", category: "Plumbing", unit: "piece", unit_cost: 340, gst_percent: 18 },
  { name: "PVC Drainage Pipe (4 inch - 10ft)", category: "Plumbing", unit: "piece", unit_cost: 520, gst_percent: 18 },
  { name: "Copper FR Wire (1.5 sq mm - 90m)", category: "Electrical", unit: "coil", unit_cost: 1750, gst_percent: 18 },
  { name: "Copper FR Wire (2.5 sq mm - 90m)", category: "Electrical", unit: "coil", unit_cost: 2650, gst_percent: 18 },
  { name: "Centering Wood / Timber", category: "Carpentry", unit: "cft", unit_cost: 2100, gst_percent: 18 }
];

const REAL_TIME_WORKERS = [
  { full_name: "Head Mason (ಮೇಸ್ತ್ರಿ)", skill: "Site Supervision & Masonry", daily_wage: 1100 },
  { full_name: "Skilled Mason (ಗಾರೆ ಕೆಲಸಗಾರ)", skill: "Brickwork & Plastering", daily_wage: 900 },
  { full_name: "Centering Carpenter (ಬಡಗಿ)", skill: "Formwork & Centering", daily_wage: 900 },
  { full_name: "Bar Bender (ಕಬ್ಬಿಣ ಕೆಲಸಗಾರ)", skill: "Steel Rebar Bending", daily_wage: 900 },
  { full_name: "Electrician (ವಿದ್ಯುತ್ ತಜ್ಞ)", skill: "Electrical Conduit & Cabling", daily_wage: 850 },
  { full_name: "Plumber (ಪ್ಲಂಬರ್)", skill: "Plumbing & Sanitary Lines", daily_wage: 850 },
  { full_name: "Painter (ಬಣ್ಣಗಾರ)", skill: "Surface Finishing & Painting", daily_wage: 800 },
  { full_name: "Male Site Helper (ಕೂಲಿ - ಪುರುಷ)", skill: "Material Handling & Mixing", daily_wage: 650 },
  { full_name: "Female Site Helper (ಕೂಲಿ - ಮಹಿಳೆ)", skill: "Curing & Site Assistance", daily_wage: 550 }
];

async function seed(projectId) {
  console.log(`Seeding real-time rates for project: ${projectId}...`);
  
  const matRows = REAL_TIME_MATERIALS.map(m => ({ ...m, project_id: projectId }));
  const { error: matErr } = await supabase.from("materials").insert(matRows);
  if (matErr) console.warn("Materials insert result:", matErr.message);
  else console.log(`✓ Inserted ${matRows.length} real-time construction materials.`);

  const workerRows = REAL_TIME_WORKERS.map(w => ({ ...w, project_id: projectId, is_active: true }));
  const { error: workerErr } = await supabase.from("workers").insert(workerRows);
  if (workerErr) console.warn("Workers insert result:", workerErr.message);
  else console.log(`✓ Inserted ${workerRows.length} standard workforce roles.`);

  console.log("Seeding complete.");
}

const targetProjectId = process.argv[2];
if (!targetProjectId) {
  console.log("Usage: node backend/seed_realtime_data.js <PROJECT_UUID>");
} else {
  seed(targetProjectId);
}

