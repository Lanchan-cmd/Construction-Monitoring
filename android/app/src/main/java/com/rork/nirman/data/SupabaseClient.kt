package com.rork.nirman.data

import android.util.Log
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import com.rork.nirman.Config

/**
 * Supabase client singleton — shared across the Android app.
 * Uses native Supabase Auth (email/password) with the same backend
 * as the web dashboard.
 */
val supabaseClient = createSupabaseClient(
    supabaseUrl = Config.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey = Config.EXPO_PUBLIC_SUPABASE_ANON_KEY,
) {
    install(Auth)
    install(Postgrest)
    install(Storage)
}

/** Storage bucket for site photos and bills. */
const val PHOTOS_BUCKET = "site-photos"
