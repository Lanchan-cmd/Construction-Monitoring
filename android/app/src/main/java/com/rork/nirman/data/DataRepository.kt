package com.rork.nirman.data

import android.util.Log
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage

/**
 * Data repository — wraps all Postgrest and Storage operations.
 * Provides a clean API for ViewModels to call.
 *
 * Supabase Kotlin SDK v3.7.0 API notes:
 * - order() is called INSIDE the select { } request block, not chained after
 * - Order enum values are ASCENDING / DESCENDING
 * - update() DSL uses set(column, value), not put()
 */
class DataRepository {

    private val auth get() = supabaseClient.auth
    private val db get() = supabaseClient.postgrest
    private val storage get() = supabaseClient.storage

    val currentUserId: String? get() = auth.currentUserOrNull()?.id

    // ---------- Projects ----------

    suspend fun getProjects(): List<Project> = try {
        db.from("projects").select {
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getProjects: ${e.message}")
        emptyList()
    }

    suspend fun getProject(id: String): Project? = try {
        db.from("projects").select {
            filter { eq("id", id) }
        }.decodeSingleOrNull()
    } catch (e: Exception) {
        Log.e("DataRepo", "getProject: ${e.message}")
        null
    }

    suspend fun createProject(project: Project): Boolean = try {
        db.from("projects").insert(project)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "createProject: ${e.message}")
        false
    }

    // ---------- Workers ----------

    suspend fun getWorkers(projectId: String): List<Worker> = try {
        db.from("workers").select {
            filter { eq("project_id", projectId) }
            order("full_name", Order.ASCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getWorkers: ${e.message}")
        emptyList()
    }

    suspend fun addWorker(worker: Worker): Boolean = try {
        db.from("workers").insert(worker)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addWorker: ${e.message}")
        false
    }

    // ---------- Attendance ----------

    suspend fun getAttendance(projectId: String, date: String): List<AttendanceRecord> = try {
        db.from("attendance").select {
            filter { eq("project_id", projectId); eq("date", date) }
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getAttendance: ${e.message}")
        emptyList()
    }

    suspend fun markAttendance(record: AttendanceRecord): Boolean = try {
        val existing = db.from("attendance").select {
            filter { eq("worker_id", record.workerId); eq("date", record.date) }
        }.decodeList<AttendanceRecord>()

        if (existing.isNotEmpty()) {
            db.from("attendance").update({
                set("status", record.status)
            }) {
                filter { eq("id", existing.first().id) }
            }
        } else {
            db.from("attendance").insert(record)
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "markAttendance: ${e.message}")
        false
    }

    // ---------- Materials ----------

    suspend fun getMaterials(projectId: String): List<Material> = try {
        db.from("materials").select {
            filter { eq("project_id", projectId) }
            order("name", Order.ASCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getMaterials: ${e.message}")
        emptyList()
    }

    suspend fun addMaterial(material: Material): Boolean = try {
        db.from("materials").insert(material)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addMaterial: ${e.message}")
        false
    }

    // ---------- Material Requests ----------

    suspend fun getMaterialRequests(projectId: String): List<MaterialRequest> = try {
        db.from("material_requests").select {
            filter { eq("project_id", projectId) }
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getMaterialRequests: ${e.message}")
        emptyList()
    }

    suspend fun addMaterialRequest(request: MaterialRequest): Boolean = try {
        db.from("material_requests").insert(request)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addMaterialRequest: ${e.message}")
        false
    }

    suspend fun updateMaterialRequestStatus(id: String, status: String): Boolean = try {
        db.from("material_requests").update({
            set("status", status)
        }) {
            filter { eq("id", id) }
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "updateMaterialRequestStatus: ${e.message}")
        false
    }

    // ---------- Expenses ----------

    suspend fun getExpenses(projectId: String): List<Expense> = try {
        db.from("expenses").select {
            filter { eq("project_id", projectId) }
            order("expense_date", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getExpenses: ${e.message}")
        emptyList()
    }

    suspend fun addExpense(expense: Expense): Boolean = try {
        db.from("expenses").insert(expense)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addExpense: ${e.message}")
        false
    }

    // ---------- Tasks ----------

    suspend fun getTasks(projectId: String): List<Task> = try {
        db.from("tasks").select {
            filter { eq("project_id", projectId) }
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getTasks: ${e.message}")
        emptyList()
    }

    suspend fun addTask(task: Task): Boolean = try {
        db.from("tasks").insert(task)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addTask: ${e.message}")
        false
    }

    suspend fun updateTaskStatus(id: String, status: String): Boolean = try {
        db.from("tasks").update({
            set("status", status)
        }) {
            filter { eq("id", id) }
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "updateTaskStatus: ${e.message}")
        false
    }

    // ---------- Issues ----------

    suspend fun getIssues(projectId: String): List<Issue> = try {
        db.from("issues").select {
            filter { eq("project_id", projectId) }
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getIssues: ${e.message}")
        emptyList()
    }

    suspend fun addIssue(issue: Issue): Boolean = try {
        db.from("issues").insert(issue)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addIssue: ${e.message}")
        false
    }

    suspend fun resolveIssue(id: String, userId: String): Boolean = try {
        db.from("issues").update({
            set("status", "resolved")
            set("resolved_by", userId)
            set("resolved_at", java.util.Date().toString())
        }) {
            filter { eq("id", id) }
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "resolveIssue: ${e.message}")
        false
    }

    // ---------- Daily Progress ----------

    suspend fun getDailyProgress(projectId: String): List<DailyProgress> = try {
        db.from("daily_progress").select {
            filter { eq("project_id", projectId) }
            order("log_date", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getDailyProgress: ${e.message}")
        emptyList()
    }

    suspend fun addDailyProgress(progress: DailyProgress): Boolean = try {
        db.from("daily_progress").upsert(progress)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addDailyProgress: ${e.message}")
        false
    }

    // ---------- Photos ----------

    suspend fun getPhotos(projectId: String): List<Photo> = try {
        db.from("photos").select {
            filter { eq("project_id", projectId) }
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getPhotos: ${e.message}")
        emptyList()
    }

    suspend fun uploadPhoto(
        projectId: String,
        fileName: String,
        bytes: ByteArray,
        caption: String?,
        photoType: String,
        userId: String,
    ): Photo? = try {
        val path = "$projectId/$fileName"
        storage.from(PHOTOS_BUCKET).upload(path, bytes)
        val publicUrl = storage.from(PHOTOS_BUCKET).publicUrl(path)
        val photo = Photo(
            projectId = projectId,
            storagePath = path,
            publicUrl = publicUrl,
            caption = caption,
            photoType = photoType,
            uploadedBy = userId,
        )
        db.from("photos").insert(photo) { select() }.decodeSingle<Photo>()
    } catch (e: Exception) {
        Log.e("DataRepo", "uploadPhoto: ${e.message}")
        null
    }

    // ---------- Payments ----------

    suspend fun getPayments(projectId: String): List<Payment> = try {
        db.from("payments").select {
            filter { eq("project_id", projectId) }
            order("payment_date", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getPayments: ${e.message}")
        emptyList()
    }

    suspend fun addPayment(payment: Payment): Boolean = try {
        db.from("payments").insert(payment)
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "addPayment: ${e.message}")
        false
    }

    // ---------- Profiles (Admin) ----------

    suspend fun getProfiles(): List<Profile> = try {
        db.from("profiles").select {
            order("created_at", Order.DESCENDING)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getProfiles: ${e.message}")
        emptyList()
    }

    suspend fun updateProfileRole(id: String, role: String): Boolean = try {
        db.from("profiles").update({
            set("role", role)
        }) {
            filter { eq("id", id) }
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "updateProfileRole: ${e.message}")
        false
    }

    suspend fun toggleProfileActive(id: String, active: Boolean): Boolean = try {
        db.from("profiles").update({
            set("is_active", active)
        }) {
            filter { eq("id", id) }
        }
        true
    } catch (e: Exception) {
        Log.e("DataRepo", "toggleProfileActive: ${e.message}")
        false
    }

    // ---------- System Logs (Admin) ----------

    suspend fun getSystemLogs(): List<SystemLog> = try {
        db.from("system_logs").select {
            order("created_at", Order.DESCENDING)
            limit(200)
        }.decodeList()
    } catch (e: Exception) {
        Log.e("DataRepo", "getSystemLogs: ${e.message}")
        emptyList()
    }
}
