package com.rork.nirman.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.ui.util.formatINR
import com.rork.nirman.ui.util.formatINRCompact
import com.rork.nirman.ui.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val user by viewModel.currentUser.collectAsState()
    val projects by viewModel.projects.collectAsState()

    LaunchedEffect(user?.id) { if (user != null) viewModel.loadProjects() }

    if (user?.role == "contractor") {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Access denied", color = MaterialTheme.colorScheme.error)
        }
        return
    }

    val totalBudget = projects.sumOf { it.budget }
    val totalUsed = projects.sumOf { it.budgetUsed }
    val activeCount = projects.count { it.status == "active" }
    val completedCount = projects.count { it.status == "completed" }
    val avgProgress = if (projects.isEmpty()) 0 else projects.sumOf { it.progressPercent } / projects.size

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reports", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Summary cards
            item {
                Text("Summary", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ReportStatCard("Total Projects", projects.size.toString(), Modifier.weight(1f))
                    ReportStatCard("Active", activeCount.toString(), Modifier.weight(1f))
                    ReportStatCard("Completed", completedCount.toString(), Modifier.weight(1f))
                }
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ReportStatCard("Total Budget", formatINRCompact(totalBudget), Modifier.weight(1f))
                    ReportStatCard("Budget Used", formatINRCompact(totalUsed), Modifier.weight(1f))
                    ReportStatCard("Avg Progress", "$avgProgress%", Modifier.weight(1f))
                }
            }

            item {
                Spacer(Modifier.height(4.dp))
                Text("Project Breakdown", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            items(projects) { project ->
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(project.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            AssistChip(onClick = {}, label = { Text(project.status, fontSize = 10.sp) })
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Budget: ${formatINR(project.budget)}", fontSize = 12.sp)
                            Text("Used: ${formatINR(project.budgetUsed)}", fontSize = 12.sp)
                        }
                        Spacer(Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = { project.progressPercent / 100f },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Progress: ${project.progressPercent}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("GST: ${project.gstPercent}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportStatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(shape = RoundedCornerShape(12.dp), modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
