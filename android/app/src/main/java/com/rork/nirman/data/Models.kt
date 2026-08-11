package com.rork.nirman.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Domain models matching the Supabase database schema.
 * Used by the Postgrest client for type-safe queries.
 */

@Serializable
data class Profile(
    val id: String,
    val email: String,
    @SerialName("full_name") val fullName: String = "",
    val role: String = "contractor",
    val phone: String? = null,
    @SerialName("preferred_language") val preferredLanguage: String = "en",
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
)

@Serializable
data class Project(
    val id: String = "",
    val name: String = "",
    val description: String? = null,
    @SerialName("created_by") val createdBy: String = "",
    @SerialName("engineer_id") val engineerId: String? = null,
    @SerialName("contractor_id") val contractorId: String? = null,
    val status: String = "planning",
    val budget: Double = 0.0,
    @SerialName("budget_used") val budgetUsed: Double = 0.0,
    @SerialName("progress_percent") val progressPercent: Int = 0,
    @SerialName("gst_percent") val gstPercent: Double = 18.0,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    val state: String? = null,
    val district: String? = null,
    val taluk: String? = null,
    val village: String? = null,
    @SerialName("pin_code") val pinCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
)

@Serializable
data class Worker(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    @SerialName("full_name") val fullName: String = "",
    val skill: String? = null,
    val phone: String? = null,
    @SerialName("daily_wage") val dailyWage: Double = 0.0,
    @SerialName("is_active") val isActive: Boolean = true,
)

@Serializable
data class AttendanceRecord(
    val id: String = "",
    @SerialName("worker_id") val workerId: String = "",
    @SerialName("project_id") val projectId: String = "",
    val date: String = "",
    val status: String = "present",
    @SerialName("hours_worked") val hoursWorked: Double? = null,
    @SerialName("overtime_hours") val overtimeHours: Double = 0.0,
    @SerialName("recorded_by") val recordedBy: String = "",
    val note: String? = null,
)

@Serializable
data class Material(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    val name: String = "",
    val category: String? = null,
    val unit: String = "unit",
    @SerialName("unit_cost") val unitCost: Double = 0.0,
    @SerialName("gst_percent") val gstPercent: Double = 18.0,
    @SerialName("min_stock_level") val minStockLevel: Double = 0.0,
)

@Serializable
data class MaterialRequest(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    @SerialName("material_id") val materialId: String? = null,
    @SerialName("material_name") val materialName: String = "",
    val quantity: Double = 0.0,
    val unit: String = "unit",
    val status: String = "pending",
    @SerialName("requested_by") val requestedBy: String = "",
    @SerialName("approved_by") val approvedBy: String? = null,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class Expense(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    val category: String = "general",
    val description: String? = null,
    val amount: Double = 0.0,
    @SerialName("gst_percent") val gstPercent: Double = 0.0,
    @SerialName("gst_amount") val gstAmount: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    @SerialName("bill_image_path") val billImagePath: String? = null,
    @SerialName("expense_date") val expenseDate: String = "",
    @SerialName("recorded_by") val recordedBy: String = "",
)

@Serializable
data class Task(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    val title: String = "",
    val description: String? = null,
    val status: String = "todo",
    val priority: String = "medium",
    @SerialName("assigned_to") val assignedTo: String? = null,
    @SerialName("assigned_to_name") val assignedToName: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("created_by") val createdBy: String = "",
)

@Serializable
data class Issue(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    val title: String = "",
    val description: String? = null,
    val severity: String = "medium",
    val status: String = "open",
    @SerialName("photo_path") val photoPath: String? = null,
    @SerialName("reported_by") val reportedBy: String = "",
)

@Serializable
data class DailyProgress(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    @SerialName("log_date") val logDate: String = "",
    @SerialName("work_description") val workDescription: String = "",
    @SerialName("progress_percent") val progressPercent: Int = 0,
    @SerialName("labour_count") val labourCount: Int = 0,
    @SerialName("hours_worked") val hoursWorked: Double = 0.0,
    @SerialName("weather_note") val weatherNote: String? = null,
    @SerialName("recorded_by") val recordedBy: String = "",
)

@Serializable
data class Photo(
    val id: String = "",
    @SerialName("project_id") val projectId: String = "",
    @SerialName("storage_path") val storagePath: String = "",
    @SerialName("public_url") val publicUrl: String? = null,
    val caption: String? = null,
    @SerialName("photo_type") val photoType: String = "site",
    @SerialName("uploaded_by") val uploadedBy: String = "",
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class Payment(
    val id: String = "",
    @SerialName("worker_id") val workerId: String = "",
    @SerialName("project_id") val projectId: String = "",
    val amount: Double = 0.0,
    @SerialName("payment_date") val paymentDate: String = "",
    val status: String = "pending",
    val method: String? = "cash",
    @SerialName("paid_by") val paidBy: String = "",
    val note: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class SystemLog(
    val id: String = "",
    @SerialName("actor_id") val actorId: String? = null,
    val action: String = "",
    @SerialName("entity_type") val entityType: String? = null,
    @SerialName("entity_id") val entityId: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)
