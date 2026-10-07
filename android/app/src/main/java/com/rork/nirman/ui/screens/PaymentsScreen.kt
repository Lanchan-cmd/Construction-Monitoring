package com.rork.nirman.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.rork.nirman.data.Payment
import com.rork.nirman.ui.viewmodel.AppViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentsScreen(navController: NavController, viewModel: AppViewModel) {
    val projects by viewModel.projects.collectAsState()
    val payments by viewModel.payments.collectAsState()
    val workers by viewModel.workers.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()

    var selectedProjectId by remember { mutableStateOf(projects.firstOrNull()?.id ?: "") }
    var showDialog by remember { mutableStateOf(false) }
    var smsSending by remember { mutableStateOf(false) }
    var smsResult by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(selectedProjectId) {
        if (selectedProjectId.isNotEmpty()) {
            viewModel.loadPayments(selectedProjectId)
            viewModel.loadProjectData(selectedProjectId)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payments") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            scope.launch {
                                smsSending = true
                                smsResult = ""
                                val project = projects.find { it.id == selectedProjectId }
                                val weekNum = LocalDate.now().let {
                                    it.dayOfYear / 7 + 1
                                }
                                var sent = 0
                                workers.filter { !it.phone.isNullOrBlank() }.forEach { worker ->
                                    val workerPayments = payments.filter { it.workerId == worker.id }
                                    val totalPaid = workerPayments.filter { it.status == "paid" }.sumOf { it.amount }
                                    val msg = "Nirman: Week $weekNum summary for ${worker.fullName}. " +
                                        "Project: ${project?.name ?: ""}. " +
                                        "Total paid: Rs.${"%.0f".format(totalPaid)}. " +
                                        "Daily wage: Rs.${"%.0f".format(worker.dailyWage)}."
                                    val ok = sendSmsToWorker(worker.phone!!, msg)
                                    if (ok) sent++
                                }
                                smsSending = false
                                smsResult = "SMS sent to $sent worker(s)"
                            }
                        },
                        enabled = !smsSending && selectedProjectId.isNotEmpty()
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send Weekly SMS")
                    }
                }
            )
        },
        floatingActionButton = {
            if (selectedProjectId.isNotEmpty()) {
                FloatingActionButton(onClick = { showDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Add Payment")
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Project selector
            if (projects.isNotEmpty()) {
                var expanded by remember { mutableStateOf(false) }
                val selectedProject = projects.find { it.id == selectedProjectId }
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it },
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    OutlinedTextField(
                        value = selectedProject?.name ?: "Select Project",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Project") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        projects.forEach { project ->
                            DropdownMenuItem(
                                text = { Text(project.name) },
                                onClick = { selectedProjectId = project.id; expanded = false }
                            )
                        }
                    }
                }
            }

            if (smsResult.isNotEmpty()) {
                Text(
                    smsResult,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            // Summary card
            val totalPaid = payments.filter { it.status == "paid" }.sumOf { it.amount }
            val totalPending = payments.filter { it.status == "pending" }.sumOf { it.amount }
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Paid", style = MaterialTheme.typography.labelSmall)
                        Text("₹${"%,.0f".format(totalPaid)}", style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary)
                    }
                }
                Card(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Pending", style = MaterialTheme.typography.labelSmall)
                        Text("₹${"%,.0f".format(totalPending)}", style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (payments.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No payments recorded", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(payments) { payment ->
                        val worker = workers.find { it.id == payment.workerId }
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(worker?.fullName ?: "Worker", style = MaterialTheme.typography.titleSmall)
                                    Text(payment.paymentDate, style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(payment.method ?: "cash", style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("₹${"%,.0f".format(payment.amount)}", style = MaterialTheme.typography.titleMedium)
                                    val statusColor = if (payment.status == "paid")
                                        MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                    Text(payment.status.uppercase(), style = MaterialTheme.typography.labelSmall,
                                        color = statusColor)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog && selectedProjectId.isNotEmpty()) {
        AddPaymentDialog(
            workers = workers,
            projectId = selectedProjectId,
            currentUserId = currentUser?.id ?: "",
            onDismiss = { showDialog = false },
            onConfirm = { payment ->
                viewModel.addPayment(payment)
                showDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddPaymentDialog(
    workers: List<com.rork.nirman.data.Worker>,
    projectId: String,
    currentUserId: String,
    onDismiss: () -> Unit,
    onConfirm: (Payment) -> Unit,
) {
    var selectedWorkerId by remember { mutableStateOf(workers.firstOrNull()?.id ?: "") }
    var amount by remember { mutableStateOf("") }
    var method by remember { mutableStateOf("cash") }
    var status by remember { mutableStateOf("paid") }
    var workerExpanded by remember { mutableStateOf(false) }
    var methodExpanded by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    val amountError = submitted && (amount.toDoubleOrNull() ?: 0.0) <= 0.0
    val workerError = submitted && selectedWorkerId.isBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Record Payment") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Worker selector
                ExposedDropdownMenuBox(expanded = workerExpanded, onExpandedChange = { workerExpanded = it }) {
                    OutlinedTextField(
                        value = workers.find { it.id == selectedWorkerId }?.fullName ?: "Select Worker",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Worker") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(workerExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = workerExpanded, onDismissRequest = { workerExpanded = false }) {
                        workers.forEach { w ->
                            DropdownMenuItem(
                                text = { Text("${w.fullName} (₹${w.dailyWage}/day)") },
                                onClick = { selectedWorkerId = w.id; workerExpanded = false }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Amount (₹) *") },
                    modifier = Modifier.fillMaxWidth(),
                    isError = amountError
                )
                if (amountError) Text("Amount must be greater than 0", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                // Method selector
                ExposedDropdownMenuBox(expanded = methodExpanded, onExpandedChange = { methodExpanded = it }) {
                    OutlinedTextField(
                        value = method,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Method") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(methodExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = methodExpanded, onDismissRequest = { methodExpanded = false }) {
                        listOf("cash", "upi", "bank", "cheque").forEach { m ->
                            DropdownMenuItem(text = { Text(m.uppercase()) }, onClick = { method = m; methodExpanded = false })
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = status == "paid", onCheckedChange = { status = if (it) "paid" else "pending" })
                    Text("Mark as Paid")
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                submitted = true
                val amt = amount.toDoubleOrNull() ?: 0.0
                if (amt > 0.0 && selectedWorkerId.isNotBlank()) {
                    onConfirm(Payment(
                        workerId = selectedWorkerId,
                        projectId = projectId,
                        amount = amt,
                        paymentDate = LocalDate.now().toString(),
                        status = status,
                        method = method,
                        paidBy = currentUserId,
                    ))
                }
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

private suspend fun sendSmsToWorker(phone: String, message: String): Boolean = withContext(Dispatchers.IO) {
    try {
        val url = URL("https://www.fast2sms.com/dev/bulkV2")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("authorization", "yqbRrNXU71zMCHPt0auSTBEOFwInv6l5dDm8pxkZiAV4cJe2W3jc5UEnyGqosH8AXOkFVhJwpduglbfQ")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        val body = JSONObject().apply {
            put("route", "q")
            put("message", message)
            put("language", "english")
            put("flash", 0)
            put("numbers", phone)
        }.toString()
        OutputStreamWriter(conn.outputStream).use { it.write(body) }
        conn.responseCode == 200
    } catch (e: Exception) {
        false
    }
}
