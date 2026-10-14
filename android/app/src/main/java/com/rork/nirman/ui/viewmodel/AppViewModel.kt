package com.rork.nirman.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rork.nirman.data.AuthRepository
import com.rork.nirman.data.DataRepository
import com.rork.nirman.data.Profile
import com.rork.nirman.data.Project
import com.rork.nirman.data.Worker
import com.rork.nirman.data.AttendanceRecord
import com.rork.nirman.data.ConstructionCatalog
import com.rork.nirman.data.Material
import com.rork.nirman.data.MaterialRequest
import com.rork.nirman.data.Expense
import com.rork.nirman.data.Task
import com.rork.nirman.data.Issue
import com.rork.nirman.data.DailyProgress
import com.rork.nirman.data.Payment
import com.rork.nirman.data.Photo
import com.rork.nirman.data.SafetyChecklist
import com.rork.nirman.data.SystemLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Single app-wide ViewModel managing auth state and all data operations.
 * Uses StateFlow for Compose to observe state changes reactively.
 */
class AppViewModel : ViewModel() {

    private val authRepo = AuthRepository()
    private val dataRepo = DataRepository()

    // ---------- Auth state ----------
    val currentUser: StateFlow<Profile?> = authRepo.currentUser
    val isLoading: StateFlow<Boolean> = authRepo.isLoading

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _isAuthenticating = MutableStateFlow(false)
    val isAuthenticating: StateFlow<Boolean> = _isAuthenticating.asStateFlow()

    // ---------- Data state ----------
    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: StateFlow<List<Project>> = _projects.asStateFlow()

    private val _selectedProject = MutableStateFlow<Project?>(null)
    val selectedProject: StateFlow<Project?> = _selectedProject.asStateFlow()

    private val _workers = MutableStateFlow<List<Worker>>(emptyList())
    val workers: StateFlow<List<Worker>> = _workers.asStateFlow()

    private val _attendance = MutableStateFlow<List<AttendanceRecord>>(emptyList())
    val attendance: StateFlow<List<AttendanceRecord>> = _attendance.asStateFlow()

    private val _materials = MutableStateFlow<List<Material>>(emptyList())
    val materials: StateFlow<List<Material>> = _materials.asStateFlow()

    private val _materialRequests = MutableStateFlow<List<MaterialRequest>>(emptyList())
    val materialRequests: StateFlow<List<MaterialRequest>> = _materialRequests.asStateFlow()

    private val _expenses = MutableStateFlow<List<Expense>>(emptyList())
    val expenses: StateFlow<List<Expense>> = _expenses.asStateFlow()

    private val _tasks = MutableStateFlow<List<Task>>(emptyList())
    val tasks: StateFlow<List<Task>> = _tasks.asStateFlow()

    private val _issues = MutableStateFlow<List<Issue>>(emptyList())
    val issues: StateFlow<List<Issue>> = _issues.asStateFlow()

    private val _dailyProgress = MutableStateFlow<List<DailyProgress>>(emptyList())
    val dailyProgress: StateFlow<List<DailyProgress>> = _dailyProgress.asStateFlow()

    private val _photos = MutableStateFlow<List<Photo>>(emptyList())
    val photos: StateFlow<List<Photo>> = _photos.asStateFlow()

    private val _safetyChecklists = MutableStateFlow<List<SafetyChecklist>>(emptyList())
    val safetyChecklists: StateFlow<List<SafetyChecklist>> = _safetyChecklists.asStateFlow()

    private val _profiles = MutableStateFlow<List<Profile>>(emptyList())
    val profiles: StateFlow<List<Profile>> = _profiles.asStateFlow()

    private val _payments = MutableStateFlow<List<Payment>>(emptyList())
    val payments: StateFlow<List<Payment>> = _payments.asStateFlow()

    private val _systemLogs = MutableStateFlow<List<SystemLog>>(emptyList())
    val systemLogs: StateFlow<List<SystemLog>> = _systemLogs.asStateFlow()

    private val _dataLoading = MutableStateFlow(false)
    val dataLoading: StateFlow<Boolean> = _dataLoading.asStateFlow()

    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    fun clearToast() { _toast.value = null }
    private fun showToast(msg: String) { _toast.value = msg }

    // ---------- Auth ----------

    fun checkSession() {
        viewModelScope.launch { authRepo.checkSession() }
    }

    fun signIn(email: String, password: String) {
        _isAuthenticating.value = true
        _authError.value = null
        viewModelScope.launch {
            val result = authRepo.signIn(email, password)
            _isAuthenticating.value = false
            if (result.isFailure) {
                _authError.value = result.exceptionOrNull()?.message ?: "Sign in failed"
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String, role: String, phone: String?) {
        _isAuthenticating.value = true
        _authError.value = null
        viewModelScope.launch {
            val result = authRepo.signUp(email, password, fullName, role, phone)
            _isAuthenticating.value = false
            if (result.isSuccess) {
                showToast("Account created! Check email for confirmation, then sign in.")
            } else {
                _authError.value = result.exceptionOrNull()?.message ?: "Sign up failed"
            }
        }
    }

    fun signOut() {
        viewModelScope.launch { authRepo.signOut() }
    }

    // ---------- Data loading ----------

    fun loadProjects() {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            _dataLoading.value = true
            _projects.value = withContext(Dispatchers.IO) {
                dataRepo.getMyProjects(user.id, user.role)
            }
            _dataLoading.value = false
        }
    }

    fun loadProject(id: String) {
        viewModelScope.launch {
            _selectedProject.value = withContext(Dispatchers.IO) { dataRepo.getProject(id) }
        }
    }

    fun loadProjectData(projectId: String) {
        viewModelScope.launch {
            _dataLoading.value = true
            withContext(Dispatchers.IO) {
                _workers.value = dataRepo.getWorkers(projectId)
                _materials.value = dataRepo.getMaterials(projectId)
                _materialRequests.value = dataRepo.getMaterialRequests(projectId)
                _expenses.value = dataRepo.getExpenses(projectId)
                _tasks.value = dataRepo.getTasks(projectId)
                _issues.value = dataRepo.getIssues(projectId)
                _dailyProgress.value = dataRepo.getDailyProgress(projectId)
                _photos.value = dataRepo.getPhotos(projectId)
                _safetyChecklists.value = dataRepo.getSafetyChecklists(projectId)
            }
            _dataLoading.value = false
        }
    }

    fun loadAttendance(projectId: String, date: String) {
        viewModelScope.launch {
            _attendance.value = withContext(Dispatchers.IO) { dataRepo.getAttendance(projectId, date) }
        }
    }

    fun createProject(project: Project) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.createProject(project) }
            showToast(if (success) "Project created" else "Failed to create project")
            if (success) loadProjects()
        }
    }

    fun addWorker(worker: Worker) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addWorker(worker) }
            showToast(if (success) "Worker added" else "Failed to add worker")
            if (success) _workers.value = dataRepo.getWorkers(worker.projectId)
        }
    }

    fun markAttendance(record: AttendanceRecord) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.markAttendance(record) }
            if (success) {
                _attendance.value = dataRepo.getAttendance(record.projectId, record.date)
            }
        }
    }

    fun addMaterial(material: Material) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addMaterial(material) }
            showToast(if (success) "Material added" else "Failed to add material")
            if (success) _materials.value = dataRepo.getMaterials(material.projectId)
        }
    }

    fun populateRealTimeMaterials(projectId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            withContext(Dispatchers.IO) {
                ConstructionCatalog.REAL_TIME_MATERIALS.forEach { item ->
                    dataRepo.addMaterial(
                        Material(
                            projectId = projectId,
                            name = item.name,
                            category = item.category,
                            unit = item.unit,
                            unitCost = item.unitCost,
                            gstPercent = item.gstPercent,
                        )
                    )
                }
            }
            _isLoading.value = false
            showToast("Populated real-time materials")
            _materials.value = withContext(Dispatchers.IO) { dataRepo.getMaterials(projectId) }
        }
    }

    fun updateMaterialRequestStatus(id: String, status: String, projectId: String) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.updateMaterialRequestStatus(id, status) }
            showToast(if (success) "Request $status" else "Failed to update")
            if (success) _materialRequests.value = dataRepo.getMaterialRequests(projectId)
        }
    }

    fun addExpense(expense: Expense) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addExpense(expense) }
            showToast(if (success) "Expense added" else "Failed to add expense")
            if (success) _expenses.value = dataRepo.getExpenses(expense.projectId)
        }
    }

    fun addTask(task: Task) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addTask(task) }
            showToast(if (success) "Task added" else "Failed to add task")
            if (success) _tasks.value = dataRepo.getTasks(task.projectId)
        }
    }

    fun updateTaskStatus(id: String, status: String, projectId: String) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.updateTaskStatus(id, status) }
            if (success) _tasks.value = dataRepo.getTasks(projectId)
        }
    }

    fun addIssue(issue: Issue) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addIssue(issue) }
            showToast(if (success) "Issue reported" else "Failed to report issue")
            if (success) _issues.value = dataRepo.getIssues(issue.projectId)
        }
    }

    fun resolveIssue(id: String, projectId: String) {
        viewModelScope.launch {
            val userId = dataRepo.currentUserId ?: ""
            val success = withContext(Dispatchers.IO) { dataRepo.resolveIssue(id, userId) }
            showToast(if (success) "Issue resolved" else "Failed to resolve")
            if (success) _issues.value = dataRepo.getIssues(projectId)
        }
    }

    fun addDailyProgress(progress: DailyProgress) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addDailyProgress(progress) }
            showToast(if (success) "Progress logged" else "Failed to log progress")
            if (success) {
                _dailyProgress.value = dataRepo.getDailyProgress(progress.projectId)
                _selectedProject.value = dataRepo.getProject(progress.projectId)
            }
        }
    }

    fun deletePhoto(photo: Photo, projectId: String) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.deletePhoto(photo) }
            showToast(if (success) "Photo deleted" else "Failed to delete")
            if (success) _photos.value = dataRepo.getPhotos(projectId)
        }
    }

    fun uploadPhoto(projectId: String, fileName: String, bytes: ByteArray, caption: String?, photoType: String) {
        viewModelScope.launch {
            val userId = dataRepo.currentUserId ?: ""
            val photo = withContext(Dispatchers.IO) {
                dataRepo.uploadPhoto(projectId, fileName, bytes, caption, photoType, userId)
            }
            showToast(if (photo != null) "Photo uploaded" else "Upload failed")
            if (photo != null) _photos.value = dataRepo.getPhotos(projectId)
        }
    }

    fun addSafetyChecklist(checklist: SafetyChecklist) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addSafetyChecklist(checklist) }
            showToast(if (success) "Safety check saved" else "Failed to save")
            if (success) {
                _safetyChecklists.value = withContext(Dispatchers.IO) {
                    dataRepo.getSafetyChecklists(checklist.projectId)
                }
            }
        }
    }

    // ---------- Admin ----------

    fun loadProfiles() {
        viewModelScope.launch {
            _profiles.value = withContext(Dispatchers.IO) { dataRepo.getProfiles() }
        }
    }

    fun updateProfileRole(id: String, role: String) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.updateProfileRole(id, role) }
            showToast(if (success) "Role updated" else "Failed to update role")
            if (success) loadProfiles()
        }
    }

    fun toggleProfileActive(id: String, active: Boolean) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.toggleProfileActive(id, active) }
            showToast(if (success) "User updated" else "Failed to update user")
            if (success) loadProfiles()
        }
    }

    fun loadPayments(projectId: String) {
        viewModelScope.launch {
            _payments.value = withContext(Dispatchers.IO) { dataRepo.getPayments(projectId) }
        }
    }

    fun addPayment(payment: Payment) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addPayment(payment) }
            showToast(if (success) "Payment recorded" else "Failed to record payment")
            if (success) _payments.value = dataRepo.getPayments(payment.projectId)
        }
    }

    fun addMaterialRequest(request: MaterialRequest) {
        viewModelScope.launch {
            val success = withContext(Dispatchers.IO) { dataRepo.addMaterialRequest(request) }
            showToast(if (success) "Request submitted" else "Failed to submit request")
            if (success) _materialRequests.value = dataRepo.getMaterialRequests(request.projectId)
        }
    }

    fun loadSystemLogs() {
        viewModelScope.launch {
            _systemLogs.value = withContext(Dispatchers.IO) { dataRepo.getSystemLogs() }
        }
    }
}
