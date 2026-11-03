package com.sunrich.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * Opens a upi://pay link with startActivityForResult and returns the UPI app's reply
 * ("Status=SUCCESS&txnId=..&ApprovalRefNo=..&responseCode=00") to the web app.
 * The reply is NOT proof of payment — the app only uses it to prefill the UTR.
 */
@CapacitorPlugin(name = "SunrichUpi")
public class SunrichUpiPlugin extends Plugin {

    @PluginMethod
    public void pay(PluginCall call) {
        String url = call.getString("url");
        String pkg = call.getString("package");
        if (url == null || !url.startsWith("upi://")) {
            call.reject("Invalid UPI link");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        if (pkg != null && !pkg.isEmpty()) intent.setPackage(pkg);
        PackageManager pm = getContext().getPackageManager();
        if (intent.resolveActivity(pm) == null) {
            JSObject ret = new JSObject();
            ret.put("noApp", true);
            call.resolve(ret);
            return;
        }
        Intent launch = (pkg != null && !pkg.isEmpty()) ? intent : Intent.createChooser(intent, "Pay with");
        startActivityForResult(call, launch, "onPayResult");
    }

    @ActivityCallback
    private void onPayResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String response = null;
        Intent data = result.getData();
        if (data != null) {
            response = data.getStringExtra("response");
            if (response == null) response = data.getStringExtra("Status") != null
                ? "Status=" + data.getStringExtra("Status")
                    + "&txnId=" + nz(data.getStringExtra("txnId"))
                    + "&ApprovalRefNo=" + nz(data.getStringExtra("ApprovalRefNo"))
                    + "&responseCode=" + nz(data.getStringExtra("responseCode"))
                : null;
        }
        JSObject ret = new JSObject();
        ret.put("response", response);
        ret.put("resultCode", result.getResultCode() == Activity.RESULT_OK ? "OK" : "CANCELED");
        call.resolve(ret);
    }

    @PluginMethod
    public void installed(PluginCall call) {
        JSArray asked = call.getArray("packages", new JSArray());
        JSArray found = new JSArray();
        PackageManager pm = getContext().getPackageManager();
        try {
            for (int i = 0; i < asked.length(); i++) {
                String p = asked.getString(i);
                try {
                    pm.getPackageInfo(p, 0);
                    found.put(p);
                } catch (PackageManager.NameNotFoundException ignored) {
                    // not installed
                }
            }
        } catch (JSONException e) {
            call.reject("Bad package list");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("packages", found);
        call.resolve(ret);
    }

    private static String nz(String s) { return s == null ? "" : s; }
}
