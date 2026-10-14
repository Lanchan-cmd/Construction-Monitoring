package com.rork.nirman.ui.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.rork.nirman.data.Photo
import com.rork.nirman.ui.util.formatDate
import com.rork.nirman.ui.viewmodel.AppViewModel
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

// ──────────────────────────────────────────────────────────────────────────────
// Helper: create a temp image file and get its URI via FileProvider
// ──────────────────────────────────────────────────────────────────────────────

private fun createImageUri(context: Context): Uri {
    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
    val file = File(context.cacheDir, "NIRMAN_${timestamp}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
}

// ──────────────────────────────────────────────────────────────────────────────
// PhotosScreen
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotosScreen(
    navController: NavController,
    viewModel: AppViewModel,
) {
    val context = LocalContext.current
    val projects by viewModel.projects.collectAsState()
    val photos by viewModel.photos.collectAsState()
    val dataLoading by viewModel.dataLoading.collectAsState()

    var selectedProjectId by remember { mutableStateOf<String?>(null) }
    var projectMenuExpanded by remember { mutableStateOf(false) }
    var photoToDelete by remember { mutableStateOf<Photo?>(null) }
    var fullscreenPhoto by remember { mutableStateOf<Photo?>(null) }

    // Camera / gallery state
    var pendingImageUri by remember { mutableStateOf<Uri?>(null) }
    var pendingImageBytes by remember { mutableStateOf<ByteArray?>(null) }
    var showUploadDialog by remember { mutableStateOf(false) }
    var captionText by remember { mutableStateOf("") }
    var photoType by remember { mutableStateOf("site") }
    var uploading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadProjects() }
    LaunchedEffect(selectedProjectId) {
        selectedProjectId?.let { viewModel.loadProjectData(it) }
    }

    // ── Camera launcher (takes a photo and saves to temp URI) ──
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && pendingImageUri != null) {
            val bytes = context.contentResolver.openInputStream(pendingImageUri!!)?.readBytes()
            if (bytes != null) {
                pendingImageBytes = bytes
                showUploadDialog = true
            }
        }
    }

    // ── Gallery launcher ──
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            val bytes = context.contentResolver.openInputStream(it)?.readBytes()
            if (bytes != null) {
                pendingImageUri = it
                pendingImageBytes = bytes
                showUploadDialog = true
            }
        }
    }

    // ── Camera permission launcher ──
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            val uri = createImageUri(context)
            pendingImageUri = uri
            cameraLauncher.launch(uri)
        }
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
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // Project picker
            ExposedDropdownMenuBox(
                expanded = projectMenuExpanded,
                onExpandedChange = { projectMenuExpanded = it }
            ) {
                OutlinedTextField(
                    value = projects.find { it.id == selectedProjectId }?.name ?: "Select Project",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Project") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(projectMenuExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(
                    expanded = projectMenuExpanded,
                    onDismissRequest = { projectMenuExpanded = false }
                ) {
                    projects.forEach { project ->
                        DropdownMenuItem(
                            text = { Text(project.name) },
                            onClick = { selectedProjectId = project.id; projectMenuExpanded = false },
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Camera + Gallery buttons (only when project selected)
            if (selectedProjectId != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Take Photo")
                    }
                    OutlinedButton(
                        onClick = { galleryLauncher.launch("image/*") },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Default.Photo, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Gallery")
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // Photo grid
            when {
                selectedProjectId == null -> Box(
                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Photo,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Select a project to view photos",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                dataLoading -> Box(
                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                    contentAlignment = Alignment.Center
                ) { CircularProgressIndicator() }

                photos.isEmpty() -> Box(
                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.AddPhotoAlternate,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "No photos yet\nTap 'Take Photo' to add the first one",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                    }
                }

                else -> LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(photos) { photo ->
                        PhotoGridCard(
                            photo = photo,
                            onClick = { fullscreenPhoto = photo },
                            onDelete = { photoToDelete = photo },
                        )
                    }
                }
            }
        }
    }

    // ── Upload dialog ──────────────────────────────────────────────────────────
    if (showUploadDialog && pendingImageBytes != null && selectedProjectId != null) {
        val photoTypes = listOf("site", "inspection", "bill", "issue", "progress")
        Dialog(onDismissRequest = { if (!uploading) { showUploadDialog = false; captionText = "" } }) {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text("Upload Photo", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(12.dp))

                    // Preview of captured image
                    pendingImageUri?.let { uri ->
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(uri)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Preview",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    // Caption
                    OutlinedTextField(
                        value = captionText,
                        onValueChange = { captionText = it },
                        label = { Text("Caption (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(10.dp))

                    // Photo type chips
                    Text("Photo Type", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        photoTypes.forEach { type ->
                            FilterChip(
                                selected = photoType == type,
                                onClick = { photoType = type },
                                label = { Text(type.replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { showUploadDialog = false; captionText = "" },
                            enabled = !uploading,
                            modifier = Modifier.weight(1f),
                        ) { Text("Cancel") }

                        Button(
                            onClick = {
                                val bytes = pendingImageBytes ?: return@Button
                                val projectId = selectedProjectId ?: return@Button
                                uploading = true
                                val timestamp = System.currentTimeMillis()
                                val fileName = "photo_$timestamp.jpg"
                                viewModel.uploadPhoto(
                                    projectId = projectId,
                                    fileName = fileName,
                                    bytes = bytes,
                                    caption = captionText.takeIf { it.isNotBlank() },
                                    photoType = photoType,
                                    onDone = {
                                        uploading = false
                                        showUploadDialog = false
                                        captionText = ""
                                        photoType = "site"
                                        pendingImageBytes = null
                                        pendingImageUri = null
                                    }
                                )
                            },
                            enabled = !uploading,
                            modifier = Modifier.weight(1f),
                        ) {
                            if (uploading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Text("Upload")
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Fullscreen photo viewer ───────────────────────────────────────────────
    fullscreenPhoto?.let { photo ->
        Dialog(onDismissRequest = { fullscreenPhoto = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black, RoundedCornerShape(16.dp))
                    .clip(RoundedCornerShape(16.dp))
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(photo.publicUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = photo.caption,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 200.dp, max = 500.dp),
                )
                // Close button
                IconButton(
                    onClick = { fullscreenPhoto = null },
                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
                // Caption at bottom
                if (!photo.caption.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .background(Color.Black.copy(alpha = 0.6f))
                            .padding(12.dp)
                    ) {
                        Text(photo.caption, color = Color.White, fontSize = 13.sp)
                    }
                }
            }
        }
    }

    // ── Delete confirmation ───────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// Photo grid card — shows actual image thumbnail
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PhotoGridCard(
    photo: Photo,
    onClick: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
    ) {
        Box {
            // Actual photo thumbnail
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(photo.publicUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = photo.caption,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )

            // Type badge (top-left)
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f),
                shape = RoundedCornerShape(bottomEnd = 8.dp),
                modifier = Modifier.align(Alignment.TopStart),
            ) {
                Text(
                    photo.photoType,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                )
            }

            // Delete button (top-right)
            IconButton(
                onClick = onDelete,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(32.dp)
                    .background(Color.Black.copy(alpha = 0.4f), RoundedCornerShape(bottomStart = 8.dp)),
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
            }

            // Caption (bottom)
            if (!photo.caption.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.55f))
                        .padding(horizontal = 6.dp, vertical = 4.dp)
                ) {
                    Text(
                        photo.caption,
                        color = Color.White,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
