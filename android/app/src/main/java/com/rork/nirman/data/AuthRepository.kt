package com.rork.nirman.data

import android.util.Log
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Auth repository — wraps Supabase Auth and profile fetching.
 * Exposes the current session/profile as a StateFlow for Compose to observe.
 */
class AuthRepository {

    private val _currentUser = MutableStateFlow<Profile?>(null)
    val currentUser: StateFlow<Profile?> = _currentUser.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    /** Check for an existing session on app start. */
    suspend fun checkSession() {
        try {
            val session = supabaseClient.auth.currentSessionOrNull()
            if (session != null) {
                session.user?.let { fetchProfile(it) }
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Session check failed: ${e.message}")
        } finally {
            _isLoading.value = false
        }
    }

    /** Sign in with email and password. */
    suspend fun signIn(email: String, password: String): Result<Profile> = try {
        supabaseClient.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        val user = supabaseClient.auth.currentUserOrNull()
        if (user != null) {
            val profile = fetchProfile(user)
            Result.success(profile)
        } else {
            Result.failure(Exception("No user returned"))
        }
    } catch (e: Exception) {
        Log.e("AuthRepository", "Sign in failed: ${e.message}")
        Result.failure(e)
    }

    /** Sign up with email, password, and profile details. */
    suspend fun signUp(
        email: String,
        password: String,
        fullName: String,
        role: String,
        phone: String?,
    ): Result<Unit> = try {
        supabaseClient.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject {
                put("full_name", fullName)
            }
        }
        val user = supabaseClient.auth.currentUserOrNull()
        if (user != null) {
            // Update the auto-created profile row with role and details
            supabaseClient.postgrest.from("profiles").update({
                set("full_name", fullName)
                set("role", role)
                set("phone", phone)
            }) {
                filter { eq("id", user.id) }
            }
        }
        Result.success(Unit)
    } catch (e: Exception) {
        Log.e("AuthRepository", "Sign up failed: ${e.message}")
        Result.failure(e)
    }

    /** Sign out and clear the current profile. */
    suspend fun signOut() {
        try {
            supabaseClient.auth.signOut()
        } catch (e: Exception) {
            Log.e("AuthRepository", "Sign out failed: ${e.message}")
        } finally {
            _currentUser.value = null
        }
    }

    /** Fetch the profile row for a Supabase auth user. */
    private suspend fun fetchProfile(user: UserInfo): Profile {
        val profile = supabaseClient.postgrest.from("profiles").select {
            filter { eq("id", user.id) }
        }.decodeSingle<Profile>()
        _currentUser.value = profile
        return profile
    }
}
