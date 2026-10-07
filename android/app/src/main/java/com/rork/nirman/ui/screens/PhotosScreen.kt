package com.rork.nirman.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.Photo
import com.rork.nirman.ui.util.formatDate
import com.rork.nirman.ui.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotosScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val projects by viewModel.projects.collectAsState()
    val photos by viewModel.photos.collectAsState()
    val dataLoading by viewModel.dataLoading.collectAsState()
    var selectedProjectId by remember { mutableStateOf<String?>(null) }
    var expanded by remember { mutableStateOf(false) }
    var photoToDelete by remember { mutableStateOf<Photo?>(null) }

    LaunchedEffect(Unit) { viewModel.loadProjects() }
    LaunchedEffect(selectedProjectId) {
        selectedProjectId?.let { viewModel.loadProjectData(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Photos", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).padding(16.dp)) {
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                OutlinedTextField(
                    value = projects.find { it.id == selectedProjectId }?.name ?: "Select Project",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Project") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    projects.forEach { project ->
                        DropdownMenuItem(
                            text = { Text(project.name) },
                            onClick = { selectedProjectId = project.id; expanded = false },
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            when {
                selectedProjectId == null -> Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center
                ) { Text("Select a project to view photos", color = MaterialTheme.colorScheme.onSurfaceVariant) }

                dataLoading -> Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }

                photos.isEmpty() -> Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center
                ) { Text("No photos uploaded yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }

                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(photos) { photo ->
                        PhotoCard(photo, onDelete = { photoToDelete = it })
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
            confirmButton = {
                TextButton(onClick = {
                    selectedProjectId?.let { viewModel.deletePhoto(photo, it) }
                    photoToDelete = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { photoToDelete = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun PhotoCard(photo: Photo, onDelete: (Photo) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(photo.caption ?: "No caption", fontWeight = FontWeight.Medium)
                Text(photo.photoType, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(formatDate(photo.createdAt.take(10)), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = { onDelete(photo) }) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}
