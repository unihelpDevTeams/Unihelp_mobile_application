package com.zenithdev.unihelp.playupdates

import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayStoreUpdatesModule : Module() {
  private var appUpdateManager: AppUpdateManager? = null
  private var latestUpdateInfo: AppUpdateInfo? = null
  private var installListener: InstallStateUpdatedListener? = null
  private lateinit var updateLauncher: androidx.activity.result.ActivityResultLauncher<IntentSenderRequest>

  override fun definition() = ModuleDefinition {
    Name("UniHelpPlayStoreUpdates")
    Events("onUpdateFlowResult", "onUpdateInstallState")

    RegisterActivityContracts {
      updateLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { _, result ->
        sendEvent("onUpdateFlowResult", mapOf("resultCode" to result.resultCode))
      }
    }

    AsyncFunction("checkForUpdateAsync") { promise: Promise ->
      val manager = getAppUpdateManager()
      manager.appUpdateInfo
        .addOnSuccessListener { info ->
          latestUpdateInfo = info
          val available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
          promise.resolve(
            mapOf(
              "isAvailable" to available,
              "priority" to info.updatePriority(),
              "stalenessDays" to (info.clientVersionStalenessDays() ?: -1),
              "installStatus" to info.installStatus(),
              "flexibleAllowed" to (available && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)),
            )
          )
        }
        .addOnFailureListener { error ->
          promise.reject("PLAY_UPDATE_CHECK_FAILED", error.localizedMessage, error)
        }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startFlexibleUpdateAsync") { promise: Promise ->
      val info = latestUpdateInfo
      if (info == null || info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) {
        promise.reject("PLAY_UPDATE_NOT_AVAILABLE", "No Play Store update is available.")
        return@AsyncFunction
      }
      if (!info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
        promise.reject("PLAY_FLEXIBLE_UPDATE_UNAVAILABLE", "Google Play does not allow a flexible update for this release.")
        return@AsyncFunction
      }
      if (appContext.currentActivity == null) {
        promise.reject("PLAY_UPDATE_NO_ACTIVITY", "The app is not in the foreground.")
        return@AsyncFunction
      }

      val manager = getAppUpdateManager()
      if (installListener == null) {
        installListener = InstallStateUpdatedListener { state ->
          sendEvent("onUpdateInstallState", mapOf("status" to state.installStatus()))
        }
        manager.registerListener(installListener!!)
      }

      try {
        manager.startUpdateFlowForResult(
          info,
          updateLauncher,
          AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
        )
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("PLAY_UPDATE_START_FAILED", error.localizedMessage, error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("completeFlexibleUpdateAsync") { promise: Promise ->
      getAppUpdateManager().completeUpdate()
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { error ->
          promise.reject("PLAY_UPDATE_COMPLETE_FAILED", error.localizedMessage, error)
        }
    }.runOnQueue(Queues.MAIN)

    OnDestroy {
      installListener?.let { appUpdateManager?.unregisterListener(it) }
      installListener = null
      appUpdateManager = null
    }
  }

  private fun getAppUpdateManager(): AppUpdateManager {
    val context = appContext.reactContext ?: error("React context is unavailable.")
    return appUpdateManager ?: AppUpdateManagerFactory.create(context).also {
      appUpdateManager = it
    }
  }
}