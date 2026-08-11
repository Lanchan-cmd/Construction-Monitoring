package com.rork.nirman.ui.screens

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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.AttendanceRecord
import com.rork.nirman.data.DailyProgress
import com.rork.nirman.data.Expense
import com.rork.nirman.data.Issue
import com.rork.nirman.data.Material
import com.rork.nirman.data.MaterialRequest
import com.rork.nirman.data.Photo
import com.rork.nirman.data.Task
import com.rork.nirman.data.Worker
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

    val tabs = listOf("Overview", "Materials", "Labour", "Expenses", "Progress", "Tasks", "Issues", "Photos")
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
                0 -> OverviewTab(project)
                1 -> MaterialsTab(
                    materials = materials,
                    requests = materialRequests,
                    canEdit = canEdit,
                    canRequest = canAdd,
                    onApprove = { id, status -> viewModel.updateMaterialRequestStatus(id, status, projectId) },
                    onAdd = { showAddMaterial = true },
                    onRequest = { showAddMaterialRequest = true },
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
                7 -> PhotosTab(photos = viewModel.photos.collectAsState().value)
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
private fun OverviewTab(project: com.rork.nirman.data.Project?) {
    if (project == null) {
        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        // Quick stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StatBox("Budget", formatINR(project.budget), Modifier.weight(1f))
            StatBox("Used", formatINR(project.budgetUsed), Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StatBox("Progress", "${project.progressPercent}%", Modifier.weight(1f))
            StatBox("GST", "${project.gstPercent}%", Modifier.weight(1f))
        }

        Spacer(Modifier.height(16.dp))

        // Location
        if (!project.state.isNullOrBlank()) {
            Text("Location", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
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

        Spacer(Modifier.height(16.dp))

        // Dates
        Text("Timeline", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
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
                Row {
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
private fun PhotosTab(photos: List<Photo>) {
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
                        }
                        Text(formatDate(photo.createdAt.take(10)), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
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
    var name by remember { mutableStateOf("") }
    var skill by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var wage by remember { mutableStateOf("500") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Worker") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = skill, onValueChange = { skill = it }, label = { Text("Skill") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = wage, onValueChange = { wage = it }, label = { Text("Daily Wage (₹)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { if (name.isNotBlank()) onAdd(name, skill.ifBlank { null }, phone.ifBlank { null }, wage.toDoubleOrNull() ?: 0.0) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddMaterialDialog(onDismiss: () -> Unit, onAdd: (String, String?, String, Double, Double) -> Unit) {
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("bag") }
    var cost by remember { mutableStateOf("0") }
    var gst by remember { mutableStateOf("18") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Material") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = unit, onValueChange = { unit = it }, label = { Text("Unit") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = cost, onValueChange = { cost = it }, label = { Text("Unit Cost (₹)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = gst, onValueChange = { gst = it }, label = { Text("GST %") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { if (name.isNotBlank()) onAdd(name, category.ifBlank { null }, unit, cost.toDoubleOrNull() ?: 0.0, gst.toDoubleOrNull() ?: 0.0) }) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AddExpenseDialog(onDismiss: () -> Unit, onAdd: (String, String?, Double, Double) -> Unit) {
    var category by remember { mutableStateOf("material") }
    var description by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("0") }
    var gst by remember { mutableStateOf("18") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Expense") },
        text = {
            Column {
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Amount (₹)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = gst, onValueChange = { gst = it }, label = { Text("GST %") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { onAdd(category, description.ifBlank { null }, amount.toDoubleOrNull() ?: 0.0, gst.toDoubleOrNull() ?: 0.0) }) { Text("Add") } },
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
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Daily Progress") },
        text = {
            Column {
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Work Description *") }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = percent, onValueChange = { percent = it }, label = { Text("Progress %") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = labour, onValueChange = { labour = it }, label = { Text("Labour Count") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = hours, onValueChange = { hours = it }, label = { Text("Hours Worked") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = { TextButton(onClick = { if (description.isNotBlank()) onAdd(description, percent.toIntOrNull() ?: 0, labour.toIntOrNull() ?: 0, hours.toDoubleOrNull() ?: 0.0) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
