package com.rork.nirman.ui.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.rork.nirman.ui.screens.LoginScreen
import com.rork.nirman.ui.screens.DashboardScreen
import com.rork.nirman.ui.screens.ProjectsScreen
import com.rork.nirman.ui.screens.ProjectDetailScreen
import com.rork.nirman.ui.screens.UsersScreen
import com.rork.nirman.ui.screens.SettingsScreen
import com.rork.nirman.ui.screens.PhotosScreen
import com.rork.nirman.ui.screens.ReportsScreen
import com.rork.nirman.ui.screens.LogsScreen
import com.rork.nirman.ui.screens.PaymentsScreen
import com.rork.nirman.ui.viewmodel.AppViewModel

/**
 * Central navigation graph. Routes:
 * - login: Auth screen (email/password)
 * - dashboard: Role-aware home
 * - projects: Project list
 * - project/{id}: Project detail with tabbed sub-modules
 * - users: Admin user management
 * - settings: Language, theme, profile, sign out
 */
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val viewModel: AppViewModel = viewModel()

    NavHost(
        navController = navController,
        startDestination = "login"
    ) {
        composable("login") {
            LoginScreen(
                navController = navController,
                viewModel = viewModel,
            )
        }
        composable("dashboard") {
            DashboardScreen(
                navController = navController,
                viewModel = viewModel,
            )
        }
        composable("projects") {
            ProjectsScreen(
                navController = navController,
                viewModel = viewModel,
            )
        }
        composable("project/{id}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("id") ?: ""
            ProjectDetailScreen(
                navController = navController,
                viewModel = viewModel,
                projectId = projectId,
            )
        }
        composable("users") {
            UsersScreen(
                navController = navController,
                viewModel = viewModel,
            )
        }
        composable("settings") {
            SettingsScreen(navController = navController, viewModel = viewModel)
        }
        composable("photos") {
            PhotosScreen(navController = navController, viewModel = viewModel)
        }
        composable("reports") {
            ReportsScreen(navController = navController, viewModel = viewModel)
        }
        composable("logs") {
            LogsScreen(navController = navController, viewModel = viewModel)
        }
        composable("payments") {
            PaymentsScreen(navController = navController, viewModel = viewModel)
        }
    }
}
