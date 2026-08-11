package com.rork.nirman.ui.util

import java.text.SimpleDateFormat
import java.util.Locale

/**
 * India-specific formatting utilities.
 * Currency uses Indian digit grouping (₹12,50,000.00).
 */
private val inrFormat = SimpleDateFormat("dd MMM yyyy", Locale("en", "IN"))

/** Format a number as Indian rupees: ₹12,50,000.00 */
fun formatINR(amount: Double): String {
    val symbols = arrayOf("", "", "", "", "", "", "", "", "", "")
    val grouping = intArrayOf(3, 2)
    val negative = amount < 0
    var num = Math.abs(amount.toLong())
    val decimal = ((Math.abs(amount) - Math.abs(amount.toLong())) * 100).toInt()
    val sb = StringBuilder()
    var groupIndex = 0
    var groupSize: Int
    if (num == 0L) {
        sb.append("0")
    } else {
        while (num > 0) {
            groupSize = if (groupIndex < grouping.size) grouping[groupIndex] else 2
            val start = Math.max(0, num.toString().length - groupSize)
            val chunk = num.toString().substring(start)
            if (sb.isNotEmpty()) sb.insert(0, ",")
            sb.insert(0, chunk)
            num /= pow10(groupSize)
            groupIndex++
        }
    }
    val result = "₹$sb.${decimal.toString().padStart(2, '0')}"
    return if (negative) "-$result" else result
}

private fun pow10(n: Int): Long {
    var result = 1L
    repeat(n) { result *= 10 }
    return result
}

/** Compact ₹ format: ₹12.5L, ₹1.2Cr */
fun formatINRCompact(amount: Double): String {
    return when {
        amount >= 10000000 -> "₹${"%.2f".format(amount / 10000000)}Cr"
        amount >= 100000 -> "₹${"%.2f".format(amount / 100000)}L"
        amount >= 1000 -> "₹${"%.1f".format(amount / 1000)}K"
        else -> "₹${amount.toInt()}"
    }
}

/** Format YYYY-MM-DD or ISO date for display: 27 Jul 2026 */
fun formatDate(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return "—"
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val date = inputFormat.parse(dateStr) ?: return dateStr.take(10)
        inrFormat.format(date)
    } catch (e: Exception) {
        dateStr.take(10)
    }
}

/** Today's date as YYYY-MM-DD */
fun todayISO(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())

/** Calculate GST amount */
fun calcGST(amount: Double, gstPercent: Double): Double = amount * gstPercent / 100

/** Calculate total with GST */
fun calcTotalWithGST(amount: Double, gstPercent: Double): Double = amount + calcGST(amount, gstPercent)
