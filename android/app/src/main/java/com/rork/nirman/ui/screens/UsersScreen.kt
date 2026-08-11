package com.rork.nirman.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.Profile
import com.rork.nirman.ui.util.formatDate
import com.rork.nirman.ui.viewmodel.AppViewModel

/**
 * Admin-only user management screen.
 * Lists all profiles with role dropdown and active toggle.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsersScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val user by viewModel.currentUser.collectAsState()
    val profiles by viewModel.profiles.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadProfiles() }

    if (user?.role != "admin") {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text("Access denied — Admins only", color = MaterialTheme.colorScheme.error)
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Users (${profiles.size})", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(profiles) { profile ->
                UserCard(
                    profile = profile,
                    isSelf = profile.id == user?.id,
                    onRoleChange = { role -> viewModel.updateProfileRole(profile.id, role) },
                    onToggleActive = { viewModel.toggleProfileActive(profile.id, !profile.isActive) },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserCard(
    profile: Profile,
    isSelf: Boolean,
    onRoleChange: (String) -> Unit,
    onToggleActive: () -> Unit,
) {
    var roleExpanded by remember { mutableStateOf(false) }
    val roles = listOf("admin", "engineer", "contractor", "owner", "supervisor", "labour")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(profile.fullName.ifBlank { "Unknown" }, fontWeight = FontWeight.SemiBold)
                    Text(profile.email, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                AssistChip(
                    onClick = {},
                    label = { Text(if (profile.isActive) "Active" else "Inactive", fontSize = 10.sp) },
                )
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Role dropdown
                Box {
                    TextButton(onClick = { roleExpanded = true }) {
                        Text("Role: ${profile.role}", fontSize = 12.sp)
                    }
                    DropdownMenu(expanded = roleExpanded, onDismissRequest = { roleExpanded = false }) {
                        roles.forEach { role ->
                            DropdownMenuItem(
                                text = { Text(role) },
                                onClick = { onRoleChange(role); roleExpanded = false },
                            )
                        }
                    }
                }

                if (!isSelf) {
                    TextButton(onClick = onToggleActive) {
                        Text(if (profile.isActive) "Deactivate" else "Activate")
                    }
                }
            }

            Text(
                "Joined: ${formatDate(profile.createdAt.take(10))}",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
