package com.bluestoneapps.miinojibwe

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MIIN-Ojibwe-react-app"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent?.let { handleIntent(it) }
  }

  private fun handleIntent(intent: Intent?) {
    try {
      intent?.let {
        Log.d("MainActivity", "Handling intent: ${it.action}")
        Log.d("MainActivity", "Intent data: ${it.data}")
        Log.d("MainActivity", "Intent extras: ${it.extras}")
        
        // Handle deep links
        if (Intent.ACTION_VIEW == it.action && it.data != null) {
          val uri = it.data
          Log.d("MainActivity", "Deep link received: $uri")
          
          // Handle miinojibwe:// scheme
          if ("miinojibwe" == uri?.scheme) {
            Log.d("MainActivity", "Processing miinojibwe deep link: ${uri.toString()}")
            // The React Native side will handle the actual navigation
          }
        }
      }
    } catch (e: Exception) {
      Log.e("MainActivity", "Error handling intent", e)
    }
  }
}
