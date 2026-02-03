package com.cypherstudio.notibee;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "ChatHead",
    permissions = {
        @Permission(strings = { Manifest.permission.SYSTEM_ALERT_WINDOW }, alias = "overlay")
    }
)
public class ChatHeadPlugin extends Plugin {

    private static final String TAG = "ChatHeadPlugin";

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean hasPermission = Settings.canDrawOverlays(getContext());
            ret.put("granted", hasPermission);
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                getActivity().startActivityForResult(intent, 1234);
                
                JSObject ret = new JSObject();
                ret.put("message", "Permission request sent. Please enable overlay permission.");
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void showChatHead(PluginCall call) {
        Log.d(TAG, "showChatHead called");
        String beeId = call.getString("beeId", "Unknown");
        String message = call.getString("message", "");
        String avatarData = call.getString("avatarData", "");
        int unreadCount = call.getInt("unreadCount", 0);

        Log.d(TAG, "beeId: " + beeId + ", message: " + message);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Log.e(TAG, "Overlay permission not granted!");
            call.reject("Overlay permission not granted");
            return;
        }

        try {
            Intent serviceIntent = new Intent(getContext(), ChatHeadService.class);
            serviceIntent.setAction(ChatHeadService.ACTION_SHOW);
            serviceIntent.putExtra("beeId", beeId);
            serviceIntent.putExtra("message", message);
            serviceIntent.putExtra("avatarData", avatarData);
            serviceIntent.putExtra("unreadCount", unreadCount);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting foreground service");
                getContext().startForegroundService(serviceIntent);
            } else {
                Log.d(TAG, "Starting service");
                getContext().startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error starting service: " + e.getMessage());
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void hideChatHead(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ChatHeadService.class);
        serviceIntent.setAction(ChatHeadService.ACTION_HIDE);
        getContext().startService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void updateChatHead(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ChatHeadService.class);
        serviceIntent.setAction(ChatHeadService.ACTION_UPDATE);
        serviceIntent.putExtra("beeId", call.getString("beeId"));
        serviceIntent.putExtra("message", call.getString("message"));
        serviceIntent.putExtra("avatarData", call.getString("avatarData"));
        serviceIntent.putExtra("unreadCount", call.getInt("unreadCount", 0));
        getContext().startService(serviceIntent);
        call.resolve();
    }
}
