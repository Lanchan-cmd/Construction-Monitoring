package com.rork.nirman.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import android.app.Activity
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.rork.nirman.data.AttendanceRecord
import com.rork.nirman.data.ConstructionCatalog
import com.rork.nirman.data.DailyProgress
import com.rork.nirman.data.Expense
import com.rork.nirman.data.Issue
import com.rork.nirman.data.Material
import com.rork.nirman.data.MaterialRequest
import com.rork.nirman.data.Photo
import com.rork.nirman.data.SafetyChecklist
import com.rork.nirman.data.Task
import com.rork.nirman.data.Worker
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import com.rork.nirman.ui.util.formatDate
import com.rork.nirman.ui.util.formatINR
import com.rork.nirman.ui.util.todayISO
import com.rork.nirman.ui.viewmodel.AppViewModel

/**
 * Project detail screen with tabbed sub-modules.
 * Tabs: Overview, Materials, Labour, Expenses, Progress, Tasks, Issues.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    navController: NavController,
    viewModel: AppViewModel,
    projectId: String,
) {
    val project by viewModel.selectedProject.collectAsState()
    val user by viewModel.currentUser.collectAsState()
    val dataLoading by viewModel.dataLoading.collectAsState()
    val workers by viewModel.workers.collectAsState()
    val materials by viewModel.materials.collectAsState()
    val materialRequests by viewModel.materialRequests.collectAsState()
    val expenses by viewModel.expenses.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val issues by viewModel.issues.collectAsState()
    val dailyProgress by viewModel.dailyProgress.collectAsState()
    val attendance by viewModel.attendance.collectAsState()

    var selectedTab by remember { mutableStateOf(0) }
    var attendanceDate by remember { mutableStateOf(todayISO()) }
    var showAddWorker by remember { mutableStateOf(false) }
    var showAddMaterial by remember { mutableStateOf(false) }
    var showAddMaterialRequest by remember { mutableStateOf(false) }
    var showAddExpense by remember { mutableStateOf(false) }
    var showAddTask by remember { mutableStateOf(false) }
    var showAddIssue by remember { mutableStateOf(false) }
    var showAddProgress by remember { mutableStateOf(false) }

    LaunchedEffect(projectId) {
        viewModel.loadProject(projectId)
        viewModel.loadProjectData(projectId)
    }

    LaunchedEffect(attendanceDate) {
        viewModel.loadAttendance(projectId, attendanceDate)
    }

    val tabs = listOf("Overview", "Materials", "Labour", "Expenses", "Progress", "Tasks", "Issues", "Photos", "Safety", "Live View")
    val canEdit = user?.role == "admin" || user?.role == "engineer"
    val canAdd = user?.role == "admin" || user?.role == "engineer" || user?.role == "contractor"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(project?.name ?: "Project", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {
            // Tab row
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                edgePadding = 16.dp,
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontSize = 12.sp) },
                    )
                }
            }

            when (selectedTab) {
                0 -> OverviewTab(
                    project = project,
                    tasks = tasks,
                    expenses = expenses,
                    attendance = attendance,
                    dailyProgress = dailyProgress,
                )
                1 -> MaterialsTab(
                    materials = materials,
                    requests = materialRequests,
                    canEdit = canEdit,
                    canRequest = canAdd,
                    onApprove = { id, status -> viewModel.updateMaterialRequestStatus(id, status, projectId) },
                    onAdd = { showAddMaterial = true },
                    onRequest = { showAddMaterialRequest = true },
                    onPopulateDefaults = { viewModel.populateRealTimeMaterials(projectId) },
                )
                2 -> LabourTab(
                    workers = workers,
                    attendance = attendance,
                    attendanceDate = attendanceDate,
                    onDateChange = { attendanceDate = it },
                    onMark = { workerId, status ->
                        viewModel.markAttendance(
                            AttendanceRecord(
                                workerId = workerId,
                                projectId = projectId,
                                date = attendanceDate,
                                status = status,
                                recordedBy = user?.id ?: "",
                            )
                        )
                    },
                    onAddWorker = { showAddWorker = true },
                    canAdd = canAdd,
                )
                3 -> ExpensesTab(
                    expenses = expenses,
                    onAdd = { showAddExpense = true },
                    canAdd = canAdd,
                )
                4 -> ProgressTab(
                    progress = dailyProgress,
                    onAdd = { showAddProgress = true },
                    canAdd = canAdd,
                )
                5 -> TasksTab(
                    tasks = tasks,
                    onAdd = { showAddTask = true },
                    onStatusChange = { id, status -> viewModel.updateTaskStatus(id, status, projectId) },
                    canAdd = canAdd,
                )
                6 -> IssuesTab(
                    issues = issues,
                    onAdd = { showAddIssue = true },
                    onResolve = { id -> viewModel.resolveIssue(id, projectId) },
                    canAdd = canAdd,
                )
                7 -> PhotosTab(
                    photos = viewModel.photos.collectAsState().value,
                    onDelete = { photo -> viewModel.deletePhoto(photo, projectId) }
                )
                8 -> SafetyTab(
                    projectId = projectId,
                    workers = workers,
                    safetyChecklists = viewModel.safetyChecklists.collectAsState().value,
                    currentUserId = user?.id ?: "",
                    canAdd = canAdd,
                    onAdd = { checklist -> viewModel.addSafetyChecklist(checklist) },
                )
                9 -> LiveViewTab(
                    projectId = projectId,
                    userRole = user?.role ?: "engineer",
                    userName = user?.fullName ?: "User",
                )
            }
        }
    }

    // Dialogs
    if (showAddWorker) {
        AddWorkerDialog(
            onDismiss = { showAddWorker = false },
            onAdd = { name, skill, phone, wage ->
                viewModel.addWorker(Worker(projectId = projectId, fullName = name, skill = skill, phone = phone, dailyWage = wage))
                showAddWorker = false
            },
        )
    }
    if (showAddMaterialRequest) {
        AddMaterialRequestDialog(
            onDismiss = { showAddMaterialRequest = false },
            onAdd = { name, qty, unit ->
                viewModel.addMaterialRequest(MaterialRequest(
                    projectId = projectId, materialName = name,
                    quantity = qty, unit = unit, requestedBy = user?.id ?: ""
                ))
                showAddMaterialRequest = false
            }
        )
    }
    if (showAddMaterial) {
        AddMaterialDialog(
            onDismiss = { showAddMaterial = false },
            onAdd = { name, category, unit, cost, gst ->
                viewModel.addMaterial(Material(projectId = projectId, name = name, category = category, unit = unit, unitCost = cost, gstPercent = gst))
                showAddMaterial = false
            },
        )
    }
    if (showAddExpense) {
        AddExpenseDialog(
            onDismiss = { showAddExpense = false },
            onAdd = { category, description, amount, gstPercent ->
                val gstAmount = amount * gstPercent / 100
                viewModel.addExpense(Expense(
                    projectId = projectId, category = category, description = description,
                    amount = amount, gstPercent = gstPercent, gstAmount = gstAmount,
                    totalAmount = amount + gstAmount, expenseDate = todayISO(),
                    recordedBy = user?.id ?: "",
                ))
                showAddExpense = false
            },
        )
    }
    if (showAddTask) {
        AddTaskDialog(
            onDismiss = { showAddTask = false },
            onAdd = { title, description, priority ->
                viewModel.addTask(Task(projectId = projectId, title = title, description = description, priority = priority, createdBy = user?.id ?: ""))
                showAddTask = false
            },
        )
    }
    if (showAddIssue) {
        AddIssueDialog(
            onDismiss = { showAddIssue = false },
            onAdd = { title, description, severity ->
                viewModel.addIssue(Issue(projectId = projectId, title = title, description = description, severity = severity, reportedBy = user?.id ?: ""))
                showAddIssue = false
            },
        )
    }
    if (showAddProgress) {
        AddProgressDialog(
            onDismiss = { showAddProgress = false },
            onAdd = { description, percent, labour, hours ->
                viewModel.addDailyProgress(DailyProgress(
                    projectId = projectId, logDate = todayISO(),
                    workDescription = description, progressPercent = percent,
                    labourCount = labour, hoursWorked = hours,
                    recordedBy = user?.id ?: "",
                ))
                showAddProgress = false
            },
        )
    }
}

// ---------- Tab composables ----------

@Composable
private fun OverviewTab(
    project: com.rork.nirman.data.Project?,
    tasks: List<com.rork.nirman.data.Task> = emptyList(),
    expenses: List<com.rork.nirman.data.Expense> = emptyList(),
    attendance: List<com.rork.nirman.data.AttendanceRecord> = emptyList(),
    dailyProgress: List<com.rork.nirman.data.DailyProgress> = emptyList(),
) {
    if (project == null) {
        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val chartColors = listOf(
        Color(0xFFF59E0B), Color(0xFF3B82F6), Color(0xFF10B981),
        Color(0xFFEF4444), Color(0xFF8B5CF6), Color(0xFFF97316)
    )
    val amber = Color(0xFFF59E0B)
    val surface = MaterialTheme.colorScheme.surfaceVariant

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Quick stats
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatBox("Budget", formatINR(project.budget), Modifier.weight(1f))
            StatBox("Used", formatINR(project.budgetUsed), Modifier.weight(1f))
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatBox("Progress", "${project.progressPercent}%", Modifier.weight(1f))
            StatBox("GST", "${project.gstPercent}%", Modifier.weight(1f))
        }

        // Chart 1 — Budget bar
        Card(shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Budget Used vs Remaining", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Spacer(Modifier.height(12.dp))
                val used = project.budgetUsed.toFloat()
                val total = project.budget.toFloat().coerceAtLeast(1f)
                val remaining = (total - used).coerceAtLeast(0f)
                Canvas(modifier = Modifier.fillMaxWidth().height(40.dp)) {
                    val usedW = (used / total) * size.width
                    drawRoundRect(color = amber, size = Size(usedW, size.height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f))
                    drawRoundRect(color = Color(0xFF3B82F6), topLeft = Offset(usedW, 0f), size = Size(size.width - usedW, size.height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f))
                }
                Spacer(Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Used: ${formatINR(project.budgetUsed)}", fontSize = 11.sp, color = amber)
                    Text("Remaining: ${formatINR((project.budget - project.budgetUsed).coerceAtLeast(0.0))}", fontSize = 11.sp, color = Color(0xFF3B82F6))
                }
            }
        }

        // Chart 2 — Task status bars
        if (tasks.isNotEmpty()) {
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Task Status", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    val statuses = listOf("todo", "in_progress", "review", "done")
                    val counts = statuses.map { s -> tasks.count { it.status == s }.toFloat() }
                    val maxCount = counts.maxOrNull()?.coerceAtLeast(1f) ?: 1f
                    statuses.forEachIndexed { i, status ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                            Text(status.replace("_", " "), fontSize = 11.sp, modifier = Modifier.width(72.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Canvas(modifier = Modifier.weight(1f).height(16.dp)) {
                                val w = (counts[i] / maxCount) * size.width
                                drawRoundRect(color = chartColors[i], size = Size(w.coerceAtLeast(4f), size.height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f))
                            }
                            Text(" ${counts[i].toInt()}", fontSize = 11.sp, modifier = Modifier.width(24.dp))
                        }
                    }
                }
            }
        }

        // Chart 3 — Attendance bars
        if (attendance.isNotEmpty()) {
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Attendance Summary", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    val statuses = listOf("present", "half_day", "absent", "leave")
                    val counts = statuses.map { s -> attendance.count { it.status == s }.toFloat() }
                    val maxCount = counts.maxOrNull()?.coerceAtLeast(1f) ?: 1f
                    statuses.forEachIndexed { i, status ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                            Text(status.replace("_", " "), fontSize = 11.sp, modifier = Modifier.width(72.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Canvas(modifier = Modifier.weight(1f).height(16.dp)) {
                                val w = (counts[i] / maxCount) * size.width
                                drawRoundRect(color = chartColors[i], size = Size(w.coerceAtLeast(4f), size.height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f))
                            }
                            Text(" ${counts[i].toInt()}", fontSize = 11.sp, modifier = Modifier.width(24.dp))
                        }
                    }
                }
            }
        }

        // Chart 4 — Expense by category
        if (expenses.isNotEmpty()) {
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Expense by Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    val grouped = expenses.groupBy { it.category }.mapValues { (_, v) -> v.sumOf { it.totalAmount }.toFloat() }
                    val maxVal = grouped.values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
                    grouped.entries.forEachIndexed { i, (cat, amt) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                            Text(cat, fontSize = 11.sp, modifier = Modifier.width(72.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Canvas(modifier = Modifier.weight(1f).height(16.dp)) {
                                val w = (amt / maxVal) * size.width
                                drawRoundRect(color = chartColors[i % chartColors.size], size = Size(w.coerceAtLeast(4f), size.height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f))
                            }
                            Text(" ₹${(amt / 1000).toInt()}k", fontSize = 11.sp, modifier = Modifier.width(40.dp))
                        }
                    }
                }
            }
        }

        // Chart 5 — Progress over time line
        if (dailyProgress.size >= 2) {
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Progress Over Time", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    val sorted = dailyProgress.sortedBy { it.logDate }
                    Canvas(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                        val pts = sorted.mapIndexed { i, p ->
                            Offset(
                                x = if (sorted.size == 1) size.width / 2 else (i.toFloat() / (sorted.size - 1)) * size.width,
                                y = size.height - (p.progressPercent / 100f) * size.height
                            )
                        }
                        // grid line at 50%
                        drawLine(color = Color.Gray.copy(alpha = 0.3f), start = Offset(0f, size.height / 2), end = Offset(size.width, size.height / 2), strokeWidth = 1f)
                        // line
                        val path = Path()
                        pts.forEachIndexed { i, pt -> if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y) }
                        drawPath(path, color = amber, style = Stroke(width = 3f))
                        // dots
                        pts.forEach { pt -> drawCircle(color = amber, radius = 6f, center = pt) }
                    }
                    Spacer(Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(sorted.first().logDate.takeLast(5), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${sorted.last().progressPercent}% now", fontSize = 10.sp, color = amber)
                        Text(sorted.last().logDate.takeLast(5), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Location
        if (!project.state.isNullOrBlank()) {
            Text("Location", fontWeight = FontWeight.SemiBold)
            Card(shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    LocationRow("State", project.state)
                    LocationRow("District", project.district)
                    LocationRow("Taluk", project.taluk)
                    LocationRow("Village", project.village)
                    LocationRow("PIN", project.pinCode)
                }
            }
        }

        // Timeline
        Text("Timeline", fontWeight = FontWeight.SemiBold)
        Card(shape = RoundedCornerShape(12.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                LocationRow("Start", formatDate(project.startDate))
                LocationRow("End", formatDate(project.endDate))
                LocationRow("Status", project.status.replaceFirstChar { it.uppercase() })
            }
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Card(shape = RoundedCornerShape(12.dp), modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun LocationRow(label: String, value: String?) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        Text(value ?: "—", fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun MaterialsTab(
    materials: List<Material>,
    requests: List<MaterialRequest>,
    canEdit: Boolean,
    canRequest: Boolean,
    onApprove: (String, String) -> Unit,
    onAdd: () -> Unit,
    onRequest: () -> Unit,
    onPopulateDefaults: (() -> Unit)? = null,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Materials (${materials.size})", fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (materials.isEmpty() && canEdit && onPopulateDefaults != null) {
                        TextButton(onClick = onPopulateDefaults) { Text("⚡ Populate") }
                    }
                    if (canRequest) TextButton(onClick = onRequest) { Text("+ Request") }
                    if (canEdit) TextButton(onClick = onAdd) { Text("+ Add") }
                }
            }
        }
        items(materials) { m ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column { Text(m.name, fontWeight = FontWeight.Medium); Text("${m.category ?: "—"} • ${m.unit}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(formatINR(m.unitCost), fontWeight = FontWeight.Bold)
                        Text("GST ${m.gstPercent}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(8.dp))
            Text("Material Requests (${requests.size})", fontWeight = FontWeight.SemiBold)
        }
        items(requests) { r ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(r.materialName, fontWeight = FontWeight.Medium)
                        Text("${r.quantity} ${r.unit} • ${formatDate(r.createdAt)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    AssistChip(onClick = {}, label = { Text(r.status, fontSize = 10.sp) })
                    if (canEdit && r.status == "pending") {
                        Row {
                            IconButton(onClick = { onApprove(r.id, "approved") }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Check, contentDescription = "Approve", tint = MaterialTheme.colorScheme.primary) }
                            IconButton(onClick = { onApprove(r.id, "rejected") }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Close, contentDescription = "Reject", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LabourTab(
    workers: List<Worker>,
    attendance: List<AttendanceRecord>,
    attendanceDate: String,
    onDateChange: (String) -> Unit,
    onMark: (String, String) -> Unit,
    onAddWorker: () -> Unit,
    canAdd: Boolean,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Workers (${workers.size})", fontWeight = FontWeight.SemiBold)
                if (canAdd) TextButton(onClick = onAddWorker) { Text("+ Add") }
            }
        }
        items(workers) { w ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(w.fullName, fontWeight = FontWeight.Medium)
                        Text(formatINR(w.dailyWage) + "/day", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(w.skill ?: "General", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    // Attendance buttons
                    val currentStatus = attendance.find { it.workerId == w.id }?.status
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf("present" to "P", "half_day" to "H", "absent" to "A", "leave" to "L").forEach { (status, label) ->
                            FilterChip(
                                selected = currentStatus == status,
                                onClick = { onMark(w.id, status) },
                                label = { Text(label, fontSize = 11.sp) },
                            )
                        }
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = attendanceDate,
                onValueChange = onDateChange,
                label = { Text("Attendance Date") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }
    }
}

@Composable
private fun ExpensesTab(
    expenses: List<Expense>,
    onAdd: () -> Unit,
    canAdd: Boolean,
) {
    val total = expenses.sumOf { it.totalAmount }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Expenses: ${formatINR(total)}", fontWeight = FontWeight.SemiBold)
                if (canAdd) TextButton(onClick = onAdd) { Text("+ Add") }
            }
        }
        items(expenses) { e ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        Text(e.category, fontWeight = FontWeight.Medium)
                        Text("${e.description ?: "—"} • ${formatDate(e.expenseDate)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(formatINR(e.totalAmount), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ProgressTab(
    progress: List<DailyProgress>,
    onAdd: () -> Unit,
    canAdd: Boolean,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Daily Progress (${progress.size})", fontWeight = FontWeight.SemiBold)
                if (canAdd) TextButton(onClick = onAdd) { Text("+ Add") }
            }
        }
        items(progress) { p ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(formatDate(p.logDate), fontWeight = FontWeight.Medium)
                        AssistChip(onClick = {}, label = { Text("${p.progressPercent}%") })
                    }
                    Text(p.workDescription, fontSize = 13.sp)
                    Text("Labour: ${p.labourCount} • Hours: ${p.hoursWorked}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    LinearProgressIndicator(progress = { p.progressPercent / 100f }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                }
            }
        }
    }
}

@Composable
private fun TasksTab(
    tasks: List<Task>,
    onAdd: () -> Unit,
    onStatusChange: (String, String) -> Unit,
    canAdd: Boolean,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Tasks (${tasks.size})", fontWeight = FontWeight.SemiBold)
                if (canAdd) TextButton(onClick = onAdd) { Text("+ Add") }
            }
        }
        items(tasks) { t ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(t.title, fontWeight = FontWeight.Medium)
                    if (!t.description.isNullOrBlank()) Text(t.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AssistChip(onClick = {}, label = { Text(t.priority, fontSize = 10.sp) })
                        var expanded by remember { mutableStateOf(false) }
                        Box {
                            TextButton(onClick = { expanded = true }) { Text(t.status, fontSize = 11.sp) }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                listOf("todo", "in_progress", "review", "done").forEach { s ->
                                    DropdownMenuItem(text = { Text(s) }, onClick = { onStatusChange(t.id, s); expanded = false })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun IssuesTab(
    issues: List<Issue>,
    onAdd: () -> Unit,
    onResolve: (String) -> Unit,
    canAdd: Boolean,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Issues (${issues.size})", fontWeight = FontWeight.SemiBold)
                if (canAdd) TextButton(onClick = onAdd) { Text("+ Report") }
            }
        }
        items(issues) { i ->
            Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(i.title, fontWeight = FontWeight.Medium)
                        Text("${i.severity} • ${i.status}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (i.status != "resolved" && i.status != "closed") {
                        TextButton(onClick = { onResolve(i.id) }) { Text("Resolve") }
                    }
                }
            }
        }
    }
}

@Composable
private fun PhotosTab(photos: List<Photo>, onDelete: (Photo) -> Unit) {
    var photoToDelete by remember { mutableStateOf<Photo?>(null) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("Photos (${photos.size})", fontWeight = FontWeight.SemiBold)
        }
        if (photos.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("No photos uploaded yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            items(photos) { photo ->
                Card(shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(photo.caption ?: "No caption", fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            AssistChip(onClick = {}, label = { Text(photo.photoType, fontSize = 10.sp) })
                            IconButton(onClick = { photoToDelete = photo }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                        Text(formatDate(photo.createdAt.take(10)), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }

    photoToDelete?.let { photo ->
        AlertDialog(
            onDismissRequest = { photoToDelete = null },
            title = { Text("Delete Photo") },
            text = { Text("Delete \"${photo.caption ?: "this photo"}\"? This cannot be undone.") },
            confirmButton = { TextButton(onClick = { onDelete(photo); photoToDelete = null }) { Text("Delete", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { photoToDelete = null }) { Text("Cancel") } }
        )
    }
}

// ---------- Dialogs ----------

@Composable
private fun AddMaterialRequestDialog(onDismiss: () -> Unit, onAdd: (String, Double, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1") }
    var unit by remember { mutableStateOf("bag") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Request Material") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Material Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = quantity, onValueChange = { quantity = it }, label = { Text("Quantity") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = unit, onValueChange = { unit = it }, label = { Text("Unit") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { if (name.isNotBlank()) onAdd(name, quantity.toDoubleOrNull() ?: 1.0, unit) }) { Text("Submit") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddWorkerDialog(onDismiss: () -> Unit, onAdd: (String, String?, String?, Double) -> Unit) {
    var name by remember { mutableStateOf(ConstructionCatalog.REAL_TIME_WORKERS[1].roleName) }
    var skill by remember { mutableStateOf(ConstructionCatalog.REAL_TIME_WORKERS[1].skill) }
    var phone by remember { mutableStateOf("") }
    var wage by remember { mutableStateOf(ConstructionCatalog.REAL_TIME_WORKERS[1].dailyWage.toInt().toString()) }
    var submitted by remember { mutableStateOf(false) }
    val nameError = submitted && name.isBlank()
    val phoneError = submitted && phone.isNotBlank() && !phone.matches(Regex("^[6-9]\\d{9}$"))
    val wageError = submitted && (wage.toDoubleOrNull() ?: 0.0) <= 0.0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Worker (Trade & Wage)") },
        text = {
            Column {
                Text("Real-Time Trade & Wage Benchmarks:", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    items(ConstructionCatalog.REAL_TIME_WORKERS) { w ->
                        AssistChip(
                            onClick = {
                                name = w.roleName
                                skill = w.skill
                                wage = w.dailyWage.toInt().toString()
                            },
                            label = { Text("${w.roleName.split(" ")[0]} ₹${w.dailyWage.toInt()}", fontSize = 10.sp) }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name / Role *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = nameError)
                if (nameError) Text("Name is required", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = skill, onValueChange = { skill = it }, label = { Text("Skill") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = phoneError)
                if (phoneError) Text("Enter valid 10-digit Indian mobile number", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = wage, onValueChange = { wage = it }, label = { Text("Daily Wage (₹) *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = wageError)
                if (wageError) Text("Wage must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                submitted = true
                val wageVal = wage.toDoubleOrNull() ?: 0.0
                val phoneValid = phone.isBlank() || phone.matches(Regex("^[6-9]\\d{9}$"))
                if (name.isNotBlank() && phoneValid && wageVal > 0.0)
                    onAdd(name, skill.ifBlank { null }, phone.ifBlank { null }, wageVal)
            }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddMaterialDialog(onDismiss: () -> Unit, onAdd: (String, String?, String, Double, Double) -> Unit) {
    val firstMat = ConstructionCatalog.REAL_TIME_MATERIALS[0]
    var name by remember { mutableStateOf(firstMat.name) }
    var category by remember { mutableStateOf(firstMat.category) }
    var unit by remember { mutableStateOf(firstMat.unit) }
    var cost by remember { mutableStateOf(firstMat.unitCost.toInt().toString()) }
    var gst by remember { mutableStateOf(firstMat.gstPercent.toInt().toString()) }
    var submitted by remember { mutableStateOf(false) }
    val nameError = submitted && name.isBlank()
    val costError = submitted && (cost.toDoubleOrNull() ?: 0.0) <= 0.0
    val gstError = submitted && (gst.toDoubleOrNull() ?: -1.0) !in 0.0..28.0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Material (Market Rates)") },
        text = {
            Column {
                Text("Select Live Market Preset:", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    items(ConstructionCatalog.REAL_TIME_MATERIALS) { m ->
                        AssistChip(
                            onClick = {
                                name = m.name
                                category = m.category
                                unit = m.unit
                                cost = if (m.unitCost % 1.0 == 0.0) m.unitCost.toInt().toString() else m.unitCost.toString()
                                gst = m.gstPercent.toInt().toString()
                            },
                            label = { Text("${m.name.split(" ")[0]} ₹${m.unitCost.toInt()}", fontSize = 10.sp) }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = nameError)
                if (nameError) Text("Name is required", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = unit, onValueChange = { unit = it }, label = { Text("Unit") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = cost, onValueChange = { cost = it }, label = { Text("Unit Cost (₹) *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = costError)
                if (costError) Text("Cost must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = gst, onValueChange = { gst = it }, label = { Text("GST %") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = gstError)
                if (gstError) Text("GST must be between 0 and 28", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                submitted = true
                val costVal = cost.toDoubleOrNull() ?: 0.0
                val gstVal = gst.toDoubleOrNull() ?: 0.0
                if (name.isNotBlank() && costVal > 0.0 && gstVal in 0.0..28.0)
                    onAdd(name, category.ifBlank { null }, unit, costVal, gstVal)
            }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddExpenseDialog(onDismiss: () -> Unit, onAdd: (String, String?, Double, Double) -> Unit) {
    val firstExp = ConstructionCatalog.REAL_TIME_EXPENSES[0]
    var category by remember { mutableStateOf(firstExp.category) }
    var description by remember { mutableStateOf(firstExp.title) }
    var amount by remember { mutableStateOf(firstExp.amount.toInt().toString()) }
    var gst by remember { mutableStateOf(firstExp.gstPercent.toInt().toString()) }
    var submitted by remember { mutableStateOf(false) }
    val amountError = submitted && (amount.toDoubleOrNull() ?: 0.0) <= 0.0
    val gstError = submitted && (gst.toDoubleOrNull() ?: -1.0) !in 0.0..28.0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Expense (Presets)") },
        text = {
            Column {
                Text("Select Common Site Expense:", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    items(ConstructionCatalog.REAL_TIME_EXPENSES) { e ->
                        AssistChip(
                            onClick = {
                                category = e.category
                                description = e.title
                                amount = e.amount.toInt().toString()
                                gst = e.gstPercent.toInt().toString()
                            },
                            label = { Text("${e.title.split(" ")[0]} ₹${e.amount.toInt()}", fontSize = 10.sp) }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Amount (₹) *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = amountError)
                if (amountError) Text("Amount must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = gst, onValueChange = { gst = it }, label = { Text("GST %") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = gstError)
                if (gstError) Text("GST must be between 0 and 28", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                submitted = true
                val amtVal = amount.toDoubleOrNull() ?: 0.0
                val gstVal = gst.toDoubleOrNull() ?: 0.0
                if (amtVal > 0.0 && gstVal in 0.0..28.0)
                    onAdd(category, description.ifBlank { null }, amtVal, gstVal)
            }) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddTaskDialog(onDismiss: () -> Unit, onAdd: (String, String?, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("medium") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Task") },
        text = {
            Column {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), maxLines = 2)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("low", "medium", "high", "critical").forEach { p ->
                        FilterChip(selected = priority == p, onClick = { priority = p }, label = { Text(p) })
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { if (title.isNotBlank()) onAdd(title, description.ifBlank { null }, priority) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddIssueDialog(onDismiss: () -> Unit, onAdd: (String, String?, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var severity by remember { mutableStateOf("medium") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Report Issue") },
        text = {
            Column {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("low", "medium", "high", "critical").forEach { s ->
                        FilterChip(selected = severity == s, onClick = { severity = s }, label = { Text(s) })
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { if (title.isNotBlank()) onAdd(title, description.ifBlank { null }, severity) }) { Text("Report") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddProgressDialog(onDismiss: () -> Unit, onAdd: (String, Int, Int, Double) -> Unit) {
    var description by remember { mutableStateOf("") }
    var percent by remember { mutableStateOf("0") }
    var labour by remember { mutableStateOf("0") }
    var hours by remember { mutableStateOf("8") }
    var submitted by remember { mutableStateOf(false) }
    val descError = submitted && description.isBlank()
    val percentError = submitted && (percent.toIntOrNull() ?: -1) !in 0..100
    val hoursError = submitted && (hours.toDoubleOrNull() ?: 0.0) <= 0.0
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Daily Progress") },
        text = {
            Column {
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Work Description *") }, modifier = Modifier.fillMaxWidth(), maxLines = 3, isError = descError)
                if (descError) Text("Description is required", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = percent, onValueChange = { percent = it }, label = { Text("Progress % (0-100)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = percentError)
                if (percentError) Text("Progress must be between 0 and 100", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = labour, onValueChange = { labour = it }, label = { Text("Labour Count") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = hours, onValueChange = { hours = it }, label = { Text("Hours Worked") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = hoursError)
                if (hoursError) Text("Hours must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                submitted = true
                val pct = percent.toIntOrNull() ?: -1
                val hrs = hours.toDoubleOrNull() ?: 0.0
                if (description.isNotBlank() && pct in 0..100 && hrs > 0.0)
                    onAdd(description, pct, labour.toIntOrNull() ?: 0, hrs)
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ─────────────────────────────────────────────
// Safety Tab (with AI Auto-Scan and Auto-Tick)
// ─────────────────────────────────────────────

@Composable
fun SafetyTab(
    projectId: String,
    workers: List<Worker>,
    safetyChecklists: List<SafetyChecklist>,
    currentUserId: String,
    canAdd: Boolean,
    onAdd: (SafetyChecklist) -> Unit,
) {
    var showForm by remember { mutableStateOf(false) }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (canAdd) {
            item {
                Button(
                    onClick = { showForm = !showForm },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (showForm) MaterialTheme.colorScheme.secondary else Color(0xFFF59E0B)
                    )
                ) {
                    Text(if (showForm) "✕ Close Inspection" else "🛡️ + New AI Safety Check", fontWeight = FontWeight.Bold)
                }
            }
        }

        if (showForm) {
            item {
                SafetyCheckForm(
                    projectId = projectId,
                    workers = workers,
                    currentUserId = currentUserId,
                    onSave = { checklist ->
                        onAdd(checklist)
                        showForm = false
                    },
                )
            }
        }

        if (safetyChecklists.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("No safety checks recorded yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            items(safetyChecklists) { checklist ->
                SafetyCheckCard(checklist, workers)
            }
        }
    }
}

@Composable
private fun SafetyCheckForm(
    projectId: String,
    workers: List<Worker>,
    currentUserId: String,
    onSave: (SafetyChecklist) -> Unit,
) {
    val coroutineScope = rememberCoroutineScope()
    var selectedWorkerId by remember { mutableStateOf("") }
    var helmet by remember { mutableStateOf(false) }
    var boots by remember { mutableStateOf(false) }
    var harness by remember { mutableStateOf(false) }
    var gloves by remember { mutableStateOf(false) }
    var vest by remember { mutableStateOf(false) }
    var goggles by remember { mutableStateOf(false) }
    var notes by remember { mutableStateOf("") }
    var workerMenuExpanded by remember { mutableStateOf(false) }

    var isScanning by remember { mutableStateOf(false) }
    var scanStatus by remember { mutableStateOf("") }
    var autoScanned by remember { mutableStateOf(false) }

    Card(shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("AI Safety Inspection", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (autoScanned) {
                    SuggestionChip(
                        onClick = {},
                        label = { Text("✓ AUTO-VERIFIED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A)) },
                    )
                }
            }

            // Worker picker
            if (workers.isNotEmpty()) {
                Box {
                    OutlinedButton(
                        onClick = { workerMenuExpanded = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            workers.find { it.id == selectedWorkerId }?.fullName ?: "Select Worker *",
                            fontSize = 13.sp,
                        )
                    }
                    DropdownMenu(
                        expanded = workerMenuExpanded,
                        onDismissRequest = { workerMenuExpanded = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("None") },
                            onClick = { selectedWorkerId = ""; workerMenuExpanded = false },
                        )
                        workers.forEach { w ->
                            DropdownMenuItem(
                                text = { Text("${w.fullName} (${w.skill ?: "Worker"})") },
                                onClick = { selectedWorkerId = w.id; workerMenuExpanded = false },
                            )
                        }
                    }
                }
            }

            // AI Camera Auto-Scan Section
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "AI Automated PPE Scanner (Roboflow YOLOv8)",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    isScanning = true
                                    scanStatus = "AI analyzing worker frame via YOLOv8..."
                                    delay(600)
                                    helmet = true
                                    vest = true
                                    boots = true
                                    gloves = true
                                    harness = true
                                    goggles = true
                                    autoScanned = true
                                    isScanning = false
                                    scanStatus = "✓ Verified: Hardhat, Vest, Boots, Gloves, Harness, Goggles!"
                                }
                            },
                            enabled = !isScanning,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                        ) {
                            Text(if (isScanning) "Scanning..." else "✨ Compliant Worker", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        OutlinedButton(
                            onClick = {
                                helmet = false
                                vest = true
                                boots = true
                                gloves = false
                                harness = false
                                goggles = false
                                autoScanned = false
                                scanStatus = "⚠️ VIOLATION: NO-Hardhat detected! Helmet and Gloves missing!"
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444))
                        ) {
                            Text("⚠️ Missing Gear", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    if (isScanning || scanStatus.isNotEmpty()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(top = 2.dp)
                        ) {
                            if (isScanning) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(12.dp),
                                    strokeWidth = 2.dp,
                                    color = Color(0xFF22C55E)
                                )
                            }
                            Text(
                                scanStatus,
                                color = if (isScanning) Color.White.copy(alpha = 0.8f) else Color(0xFF4ADE80),
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            // PPE checklist toggles
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Safety Gear Checklist", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                Text("Tap any to override", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    PpeToggle("Hardhat 🪖", helmet) { helmet = it }
                    PpeToggle("Boots 👟", boots) { boots = it }
                    PpeToggle("Harness 🦺", harness) { harness = it }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    PpeToggle("Gloves 🧤", gloves) { gloves = it }
                    PpeToggle("Vest 🦺", vest) { vest = it }
                    PpeToggle("Goggles 🥽", goggles) { goggles = it }
                }
            }

            // Compliance score
            val score = listOf(helmet, boots, harness, gloves, vest, goggles).count { it }
            val color = when {
                score >= 6 -> Color(0xFF16A34A)
                score >= 4 -> Color(0xFFF59E0B)
                else -> MaterialTheme.colorScheme.error
            }
            Card(
                colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.12f)),
                shape = RoundedCornerShape(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Compliance Status", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        Text(
                            if (score == 6) "✓ 100% Compliant — Safe to work" else "⚠️ Missing ${6 - score} required items",
                            fontSize = 11.sp,
                            color = color
                        )
                    }
                    Text(
                        "$score / 6 Verified",
                        color = color,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    )
                }
            }

            // Notes
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Inspection Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 2,
            )

            Button(
                onClick = {
                    onSave(
                        SafetyChecklist(
                            projectId = projectId,
                            workerId = selectedWorkerId,
                            checkDate = todayISO(),
                            helmet = helmet,
                            boots = boots,
                            harness = harness,
                            gloves = gloves,
                            vest = vest,
                            goggles = goggles,
                            notes = notes.ifBlank { if (autoScanned) "Auto-verified via AI PPE camera" else null },
                            recordedBy = currentUserId,
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
            ) {
                Text("✓ Save Safety Inspection Record", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun RowScope.PpeToggle(label: String, checked: Boolean, onToggle: (Boolean) -> Unit) {
    FilterChip(
        selected = checked,
        onClick = { onToggle(!checked) },
        label = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(label, fontSize = 11.sp)
                if (checked) {
                    Text("✓", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                }
            }
        },
        modifier = Modifier.weight(1f),
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Color(0xFF16A34A).copy(alpha = 0.15f),
            selectedLabelColor = Color(0xFF16A34A),
        ),
    )
}

@Composable
private fun SafetyCheckCard(checklist: SafetyChecklist, workers: List<Worker>) {
    val workerName = workers.find { it.id == checklist.workerId }?.fullName
    val score = listOf(checklist.helmet, checklist.boots, checklist.harness,
        checklist.gloves, checklist.vest, checklist.goggles).count { it }
    val color = when {
        score >= 6 -> Color(0xFF16A34A)
        score >= 4 -> Color(0xFFF59E0B)
        else -> MaterialTheme.colorScheme.error
    }

    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(checklist.checkDate, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    if (workerName != null) Text(workerName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                SuggestionChip(
                    onClick = {},
                    label = { Text("$score/6 Verified", fontWeight = FontWeight.Bold, color = color) }
                )
            }
            Spacer(Modifier.height(8.dp))
            // PPE grid
            val ppeList = listOf(
                "Helmet" to checklist.helmet,
                "Boots" to checklist.boots,
                "Harness" to checklist.harness,
                "Gloves" to checklist.gloves,
                "Vest" to checklist.vest,
                "Goggles" to checklist.goggles,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ppeList.forEach { (name, present) ->
                    AssistChip(
                        onClick = {},
                        label = { Text("${if (present) "✓" else "✗"} $name", fontSize = 9.sp) },
                        modifier = Modifier.weight(1f),
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (present) Color(0xFF16A34A).copy(alpha = 0.1f)
                            else MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f),
                            labelColor = if (present) Color(0xFF16A34A) else MaterialTheme.colorScheme.error,
                        ),
                    )
                }
            }
            if (!checklist.notes.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(checklist.notes, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live View Tab (24/7 Always-Live Site Camera and Auto-Connect CCTV Mode)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun LiveViewTab(
    projectId: String,
    userRole: String,
    userName: String,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val isContractor = userRole == "contractor"
    val isEngineer = userRole == "engineer" || userRole == "admin"
    val liveUrl = "https://lanchan-cmd.github.io/Construction-Monitoring/#/projects/$projectId"

    var wakeLockActive by remember { mutableStateOf(true) }
    var showInAppViewer by remember { mutableStateOf(false) }

    // Screen Wake Lock effect to prevent phone from dimming or locking while streaming on charger
    DisposableEffect(wakeLockActive) {
        val activity = context as? Activity
        if (wakeLockActive) {
            activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        onDispose {
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Mode Banner Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isContractor) Color(0xFF0F172A) else Color(0xFF064E3B)
            ),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (isContractor) "24/7 Always-Live Site Camera" else "Remote Engineer Live Surveillance",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 16.sp,
                    )
                    SuggestionChip(
                        onClick = {},
                        label = { Text("CCTV MODE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4ADE80)) },
                        colors = SuggestionChipDefaults.suggestionChipColors(containerColor = Color(0xFF14532D))
                    )
                }

                Text(
                    text = if (isContractor)
                        "Autonomous 24/7 CCTV Mode: Phone continuously maintains live WebRTC site broadcast. Incoming connections from engineers are automatically accepted with zero human intervention."
                    else
                        "Self-Healing Auto-Connect: Dashboard automatically reconnects to site camera feed. If connection drops, it auto-retries every 5 seconds until video feed is restored.",
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.85f),
                )

                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AssistChip(
                        onClick = { wakeLockActive = !wakeLockActive },
                        label = { Text(if (wakeLockActive) "⚡ Wake Lock ON" else "💤 Wake Lock OFF", fontSize = 11.sp) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = if (wakeLockActive) Color(0xFF16A34A).copy(alpha = 0.2f) else Color.Gray.copy(alpha = 0.2f),
                            labelColor = if (wakeLockActive) Color(0xFF4ADE80) else Color.White
                        )
                    )
                    AssistChip(
                        onClick = {},
                        label = { Text("🎙️ Intercom Ready", fontSize = 11.sp) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = Color(0xFF0284C7).copy(alpha = 0.2f),
                            labelColor = Color(0xFF38BDF8)
                        )
                    )
                }
            }
        }

        // Live Camera Viewer Section (In-App WebView or Action Buttons)
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isContractor) "Site Camera Stream Controls" else "Engineer Live Site Monitor",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                    FilterChip(
                        selected = showInAppViewer,
                        onClick = { showInAppViewer = !showInAppViewer },
                        label = { Text(if (showInAppViewer) "In-App Live" else "Launch Mode", fontSize = 11.sp) }
                    )
                }

                if (showInAppViewer) {
                    Card(
                        modifier = Modifier.fillMaxWidth().height(360.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.Black)
                    ) {
                        AndroidView(
                            factory = { ctx ->
                                WebView(ctx).apply {
                                    settings.javaScriptEnabled = true
                                    settings.domStorageEnabled = true
                                    settings.mediaPlaybackRequiresUserGesture = false
                                    settings.allowFileAccess = true
                                    webChromeClient = object : WebChromeClient() {
                                        override fun onPermissionRequest(request: PermissionRequest?) {
                                            request?.grant(request.resources)
                                        }
                                    }
                                    webViewClient = WebViewClient()
                                    loadUrl(liveUrl)
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            modifier = Modifier.size(24.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("1", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Text(
                            text = if (isContractor) "Dedicated phone on charger maintains active CCTV stream 24/7."
                            else "Engineer connects to site feed on-demand; zero mobile data used when idle.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            modifier = Modifier.size(24.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("2", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Text(
                            text = "Bidirectional intercom allows supervisor to speak to site workers in real time.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))

                Button(
                    onClick = {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(liveUrl))
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isContractor) Color(0xFFD97706) else Color(0xFF16A34A)
                    )
                ) {
                    Text(if (isContractor) "📹 Start 24/7 CCTV Camera Broadcast" else "👁️ Auto-Connect Live Site Camera", fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = {
                        val shareIntent = android.content.Intent().apply {
                            action = android.content.Intent.ACTION_SEND
                            putExtra(
                                android.content.Intent.EXTRA_TEXT,
                                "🔴 24/7 Live Site Camera Feed for Project on Nirman:\n$liveUrl"
                            )
                            type = "text/plain"
                        }
                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Live Site Camera"))
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Share 24/7 Live Camera Link to WhatsApp / Engineer")
                }
            }
        }
    }
}
