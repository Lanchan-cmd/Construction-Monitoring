package com.rork.nirman.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.Project
import com.rork.nirman.ui.util.formatINRCompact
import com.rork.nirman.ui.viewmodel.AppViewModel

/**
 * Projects list screen with search and role-gated create button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val user by viewModel.currentUser.collectAsState()
    val projects by viewModel.projects.collectAsState()
    val dataLoading by viewModel.dataLoading.collectAsState()
    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("all") }
    var showCreateDialog by remember { mutableStateOf(false) }
    var statusMenuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(user?.id) { if (user != null) viewModel.loadProjects() }

    val canCreate = user?.role == "admin" || user?.role == "engineer"
    val statuses = listOf("all", "planning", "active", "on_hold", "completed", "cancelled")
    val filtered = projects.filter {
        val matchSearch = it.name.contains(search, ignoreCase = true) || (it.state ?: "").contains(search, ignoreCase = true)
        val matchStatus = statusFilter == "all" || it.status == statusFilter
        matchSearch && matchStatus
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Projects", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (canCreate) {
                        IconButton(onClick = { showCreateDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Add")
                        }
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {
            // Search bar
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text("Search projects...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
            )

            // Status filter chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp),
            ) {
                items(listOf("all", "planning", "active", "on_hold", "completed", "cancelled")) { s ->
                    FilterChip(
                        selected = statusFilter == s,
                        onClick = { statusFilter = s },
                        label = { Text(s.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp) },
                    )
                }
            }

            if (dataLoading && projects.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator() }
            } else if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) { Text("No projects found", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filtered) { project ->
                        ProjectListItem(project) { navController.navigate("project/${project.id}") }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateProjectDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { project ->
                viewModel.createProject(project)
                showCreateDialog = false
            },
            userId = user?.id ?: "",
        )
    }
}

@Composable
private fun ProjectListItem(project: Project, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(project.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                AssistChip(onClick = {}, label = { Text(project.status, fontSize = 10.sp) })
            }
            if (!project.state.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        " ${project.village ?: ""}, ${project.district ?: ""}, ${project.state}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(progress = { project.progressPercent / 100f }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("${project.progressPercent}%", fontSize = 11.sp)
                Text(formatINRCompact(project.budget), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateProjectDialog(
    onDismiss: () -> Unit,
    onCreate: (Project) -> Unit,
    userId: String,
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("Karnataka") }
    var district by remember { mutableStateOf("") }
    var taluk by remember { mutableStateOf("") }
    var village by remember { mutableStateOf("") }
    var pinCode by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }
    val nameError = submitted && name.isBlank()
    val budgetError = submitted && (budget.toDoubleOrNull() ?: 0.0) <= 0.0
    val pinError = submitted && pinCode.isNotBlank() && !pinCode.matches(Regex("^\\d{6}$"))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Project") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Project Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = nameError)
                if (nameError) Text("Project name is required", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), maxLines = 2)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = budget, onValueChange = { budget = it }, label = { Text("Budget (₹) *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), isError = budgetError)
                if (budgetError) Text("Budget must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = state, onValueChange = { state = it }, label = { Text("State") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = district, onValueChange = { district = it }, label = { Text("District") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = taluk, onValueChange = { taluk = it }, label = { Text("Taluk") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = village, onValueChange = { village = it }, label = { Text("Village") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = pinCode, onValueChange = { pinCode = it }, label = { Text("PIN Code") }, modifier = Modifier.fillMaxWidth(), singleLine = true, isError = pinError)
                if (pinError) Text("PIN code must be 6 digits", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    submitted = true
                    val budgetVal = budget.toDoubleOrNull() ?: 0.0
                    val pinValid = pinCode.isBlank() || pinCode.matches(Regex("^\\d{6}$"))
                    if (name.isNotBlank() && budgetVal > 0.0 && pinValid && userId.isNotBlank()) {
                        onCreate(
                            Project(
                                name = name,
                                description = description.ifBlank { null },
                                budget = budgetVal,
                                state = state.ifBlank { null },
                                district = district.ifBlank { null },
                                taluk = taluk.ifBlank { null },
                                village = village.ifBlank { null },
                                pinCode = pinCode.ifBlank { null },
                                createdBy = userId,
                            )
                        )
                    }
                },
            ) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
