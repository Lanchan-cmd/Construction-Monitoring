package com.rork.nirman.data

/**
 * Real-time Indian Construction Market Rates Catalog (2024–2026)
 * Benchmark rates for South India / Karnataka.
 */
data class CatalogMaterialItem(
    val name: String,
    val category: String,
    val unit: String,
    val unitCost: Double,
    val gstPercent: Double,
    val description: String = "",
)

data class CatalogWorkerRole(
    val roleName: String,
    val skill: String,
    val dailyWage: Double,
    val description: String = "",
)

data class CatalogExpensePreset(
    val title: String,
    val category: String,
    val amount: Double,
    val gstPercent: Double,
)

object ConstructionCatalog {
    val REAL_TIME_MATERIALS = listOf(
        CatalogMaterialItem("Cement (OPC 53 - 50kg)", "Structural", "bag", 390.0, 28.0, "High-grade 53 OPC cement"),
        CatalogMaterialItem("TMT Steel Rebar (Fe 550D)", "Structural", "kg", 68.0, 18.0, "Corrosion-resistant steel rebar"),
        CatalogMaterialItem("M-Sand (Concreting)", "Aggregates", "ton", 1650.0, 5.0, "Manufactured sand for RCC"),
        CatalogMaterialItem("P-Sand (Plastering)", "Aggregates", "ton", 1850.0, 5.0, "Fine sand for wall plaster"),
        CatalogMaterialItem("Coarse Aggregate 20mm", "Aggregates", "ton", 1250.0, 5.0, "20mm granite jelly for concrete"),
        CatalogMaterialItem("Coarse Aggregate 40mm", "Aggregates", "ton", 1150.0, 5.0, "40mm aggregate for foundation"),
        CatalogMaterialItem("Red Clay Wirecut Bricks", "Masonry", "piece", 11.0, 12.0, "Standard kiln-burnt clay bricks"),
        CatalogMaterialItem("Solid Concrete Block (6\")", "Masonry", "piece", 44.0, 12.0, "6-inch dense concrete block"),
        CatalogMaterialItem("Solid Concrete Block (8\")", "Masonry", "piece", 52.0, 12.0, "8-inch load bearing block"),
        CatalogMaterialItem("Ready Mix Concrete (M25)", "Structural", "cu.m", 4600.0, 18.0, "Design mix concrete delivered on site"),
        CatalogMaterialItem("Steel Binding Wire 18G", "Structural", "kg", 82.0, 18.0, "Flexible rebar tying wire"),
        CatalogMaterialItem("Waterproofing Chemical", "Chemicals", "litre", 160.0, 18.0, "Integral waterproofing admixture"),
        CatalogMaterialItem("Exterior Acrylic Paint", "Finishing", "litre", 320.0, 18.0, "Weatherproof exterior emulsion"),
        CatalogMaterialItem("Vitrified Floor Tiles 2x2", "Flooring", "sq.ft", 65.0, 18.0, "Double charge floor tiles"),
        CatalogMaterialItem("Granite Slab", "Flooring", "sq.ft", 155.0, 18.0, "18mm polished South Indian granite"),
        CatalogMaterialItem("CPVC Pipe 1\" x 10ft", "Plumbing", "piece", 340.0, 18.0, "Hot/cold water pressure pipe"),
        CatalogMaterialItem("PVC Drainage Pipe 4\"", "Plumbing", "piece", 520.0, 18.0, "Sanitary disposal drainage pipe"),
        CatalogMaterialItem("Copper Wire 1.5 sq mm", "Electrical", "coil", 1750.0, 18.0, "90m flame-retardant conduit wire"),
        CatalogMaterialItem("Copper Wire 2.5 sq mm", "Electrical", "coil", 2650.0, 18.0, "90m power plug wire"),
        CatalogMaterialItem("Centering Wood / Timber", "Carpentry", "cft", 2100.0, 18.0, "Structural lumber for centering"),
    )

    val REAL_TIME_WORKERS = listOf(
        CatalogWorkerRole("Head Mason (ಮೇಸ್ತ್ರಿ)", "Site Supervision & Masonry", 1100.0),
        CatalogWorkerRole("Skilled Mason (ಗಾರೆ ಕೆಲಸ)", "Brickwork & Plastering", 900.0),
        CatalogWorkerRole("Centering Carpenter (ಬಡಗಿ)", "Formwork & Centering", 900.0),
        CatalogWorkerRole("Bar Bender (ಕಬ್ಬಿಣ ಕೆಲಸ)", "Steel Rebar Bending", 900.0),
        CatalogWorkerRole("Electrician (ವಿದ್ಯುತ್)", "Electrical Conduit & Cabling", 850.0),
        CatalogWorkerRole("Plumber (ಪ್ಲಂಬರ್)", "Plumbing & Sanitary Lines", 850.0),
        CatalogWorkerRole("Painter (ಬಣ್ಣಗಾರ)", "Finishing & Painting", 800.0),
        CatalogWorkerRole("Male Helper (ಕೂಲಿ - ಗಂಡು)", "Material Handling & Mixing", 650.0),
        CatalogWorkerRole("Female Helper (ಕೂಲಿ - ಹೆಣ್ಣು)", "Curing & General Assistance", 550.0),
    )

    val REAL_TIME_EXPENSES = listOf(
        CatalogExpensePreset("JCB Excavation (Daily)", "equipment", 12000.0, 18.0),
        CatalogExpensePreset("Concrete Mixer Rental", "equipment", 1200.0, 18.0),
        CatalogExpensePreset("Tipper Truck Freight", "transport", 3500.0, 5.0),
        CatalogExpensePreset("Water Tanker (6000L)", "misc", 900.0, 0.0),
        CatalogExpensePreset("Worker Bhatta & Tea", "food", 1500.0, 0.0),
        CatalogExpensePreset("Scaffolding Rental", "equipment", 6500.0, 18.0),
    )
}

