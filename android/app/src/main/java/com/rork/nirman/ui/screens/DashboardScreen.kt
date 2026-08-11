package com.rork.nirman.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Construction
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.Project
import com.rork.nirman.ui.theme.Amber500
import com.rork.nirman.ui.theme.Amber600
import com.rork.nirman.ui.theme.Slate900
import com.rork.nirman.ui.util.formatINRCompact
import com.rork.nirman.ui.viewmodel.AppViewModel

/**
 * Role-aware dashboard screen.
 * Shows summary stat cards, quick actions, and recent projects.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val user by viewModel.currentUser.collectAsState()
    val projects by viewModel.projects.collectAsState()
    val dataLoading by viewModel.dataLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadProjects() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Nirman", fontWeight = FontWeight.Bold)
                        Text(
                            user?.role?.replaceFirstChar { it.uppercase() } ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("settings") }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                    IconButton(onClick = {
                        viewModel.signOut()
                        navController.navigate("login") { popUpTo(0) }
                    }) {
                        Icon(Icons.Default.Logout, contentDescription = "Sign Out")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // Welcome banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Slate900)
                    .padding(20.dp),
            ) {
                Column {
                    Text(
                        "Welcome, ${user?.fullName?.split(" ")?.firstOrNull() ?: "User"}",
                        color = Amber500,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "${projects.size} projects • ${projects.count { it.status == "active" }} active",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                    )
                }
            }

            // Stat cards row
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val activeProjects = projects.count { it.status == "active" }
                val totalBudget = projects.sumOf { it.budget }
                val budgetUsed = projects.sumOf { it.budgetUsed }

                item { StatCard("Projects", projects.size.toString(), Icons.Default.Construction, Amber600) }
                item { StatCard("Active", activeProjects.toString(), Icons.Default.Build, MaterialTheme.colorScheme.tertiary) }
                item { StatCard("Budget", formatINRCompact(totalBudget), Icons.Default.Dashboard, Amber500) }
                item { StatCard("Used", formatINRCompact(budgetUsed), Icons.Default.Report, MaterialTheme.colorScheme.error) }
            }

            Spacer(Modifier.height(16.dp))

            // Quick actions
            Text(
                "Quick Actions",
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            Spacer(Modifier.height(8.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { ActionCard("Projects", Icons.Default.Work) { navController.navigate("projects") } }
                item { ActionCard("Payments", Icons.Default.Dashboard) { navController.navigate("payments") } }
                item { ActionCard("Photos", Icons.Default.Build) { navController.navigate("photos") } }
                if (user?.role == "admin" || user?.role == "engineer" || user?.role == "owner") {
                    item { ActionCard("Reports", Icons.Default.Report) { navController.navigate("reports") } }
                }
                if (user?.role == "admin") {
                    item { ActionCard("Users", Icons.Default.Group) { navController.navigate("users") } }
                    item { ActionCard("Logs", Icons.Default.Dashboard) { navController.navigate("logs") } }
                }
                item { ActionCard("Settings", Icons.Default.Settings) { navController.navigate("settings") } }
            }

            Spacer(Modifier.height(16.dp))

            // Recent projects
            Text(
                "Recent Projects",
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            Spacer(Modifier.height(8.dp))

            if (dataLoading && projects.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator() }
            } else if (projects.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) { Text("No projects yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(projects.take(10)) { project ->
                        ProjectCard(project) { navController.navigate("project/${project.id}") }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: ImageVector, color: Color) {
    Card(modifier = Modifier.width(140.dp), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(Modifier.height(8.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ActionCard(label: String, icon: ImageVector, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.size(width = 120.dp, height = 90.dp),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(4.dp))
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun ProjectCard(project: Project, onClick: () -> Unit) {
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
                Text(
                    "${project.village ?: ""}, ${project.district ?: ""}, ${project.state}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { project.progressPercent / 100f },
                modifier = Modifier.fillMaxWidth(),
            )
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
