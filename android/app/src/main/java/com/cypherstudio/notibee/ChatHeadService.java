package com.cypherstudio.notibee;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

public class ChatHeadService extends Service {

    public static final String ACTION_SHOW = "ACTION_SHOW";
    public static final String ACTION_HIDE = "ACTION_HIDE";
    public static final String ACTION_UPDATE = "ACTION_UPDATE";
    private static final String CHANNEL_ID = "ChatHeadChannel";
    private static final int NOTIFICATION_ID = 9001;

    private WindowManager windowManager;
    private View chatHeadView;
    private WindowManager.LayoutParams params;
    
    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    
    private String currentBeeId;
    private String currentMessage;
    private String currentAvatarData;
    private int currentUnreadCount;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            
            switch (action) {
                case ACTION_SHOW:
                    currentBeeId = intent.getStringExtra("beeId");
                    currentMessage = intent.getStringExtra("message");
                    currentAvatarData = intent.getStringExtra("avatarData");
                    currentUnreadCount = intent.getIntExtra("unreadCount", 0);
                    showChatHead();
                    break;
                    
                case ACTION_HIDE:
                    hideChatHead();
                    break;
                    
                case ACTION_UPDATE:
                    currentBeeId = intent.getStringExtra("beeId");
                    currentMessage = intent.getStringExtra("message");
                    currentAvatarData = intent.getStringExtra("avatarData");
                    currentUnreadCount = intent.getIntExtra("unreadCount", 0);
                    updateChatHead();
                    break;
            }
        }
        
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Chat Head Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps chat heads active");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void showChatHead() {
        if (chatHeadView != null) {
            updateChatHead();
            return;
        }

        // Start foreground service
        startForeground(NOTIFICATION_ID, createNotification());

        // Inflate chat head layout
        chatHeadView = LayoutInflater.from(this).inflate(R.layout.chat_head_layout, null);

        // Set up window parameters
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 100;

        // Set up touch listener for dragging
        chatHeadView.setOnTouchListener(new View.OnTouchListener() {
            private long startClickTime;
            private static final int MAX_CLICK_DURATION = 200;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        startClickTime = System.currentTimeMillis();
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(chatHeadView, params);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long clickDuration = System.currentTimeMillis() - startClickTime;
                        if (clickDuration < MAX_CLICK_DURATION) {
                            // It's a click, open the app
                            openApp();
                        } else {
                            // It's a drag, snap to edge
                            snapToEdge();
                        }
                        return true;
                }
                return false;
            }
        });

        // Update the chat head content
        updateChatHeadContent();

        // Add to window manager
        windowManager.addView(chatHeadView, params);
    }

    private void updateChatHead() {
        if (chatHeadView != null) {
            updateChatHeadContent();
        }
    }

    private void updateChatHeadContent() {
        if (chatHeadView == null) return;

        ImageView avatarView = chatHeadView.findViewById(R.id.chat_head_avatar);
        TextView badgeView = chatHeadView.findViewById(R.id.chat_head_badge);

        // Generate bee avatar from customization data
        Bitmap beeAvatar = generateBeeAvatar(currentAvatarData);
        if (beeAvatar != null) {
            avatarView.setImageBitmap(beeAvatar);
        } else {
            // Fallback to default bee emoji
            avatarView.setImageResource(R.drawable.ic_stat_bee);
        }

        // Update unread badge
        if (currentUnreadCount > 0) {
            badgeView.setVisibility(View.VISIBLE);
            badgeView.setText(currentUnreadCount > 99 ? "99+" : String.valueOf(currentUnreadCount));
        } else {
            badgeView.setVisibility(View.GONE);
        }
    }

    private Bitmap generateBeeAvatar(String avatarData) {
        try {
            if (avatarData == null || avatarData.isEmpty()) {
                return null;
            }

            // Check if it's base64 image
            if (avatarData.startsWith("data:image")) {
                String base64Image = avatarData.substring(avatarData.indexOf(",") + 1);
                byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
            }

            // Parse JSON customization (top, body, eyes, accessories)
            JSONObject customization = new JSONObject(avatarData);
            
            // For now, return a simple colored circle with bee emoji
            // In production, you'd render the actual bee parts here
            return createSimpleBeeAvatar();

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private Bitmap createSimpleBeeAvatar() {
        int size = 200;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        
        // Draw golden circle background
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.parseColor("#ffbf00"));
        canvas.drawCircle(size / 2, size / 2, size / 2, paint);
        
        // Draw bee stripes (simplified)
        paint.setColor(Color.parseColor("#1a1a1a"));
        paint.setStrokeWidth(20);
        canvas.drawLine(0, size * 0.3f, size, size * 0.3f, paint);
        canvas.drawLine(0, size * 0.6f, size, size * 0.6f, paint);
        
        return bitmap;
    }

    private void snapToEdge() {
        // Get screen width
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        
        // Snap to nearest edge
        if (params.x < screenWidth / 2) {
            params.x = 0;
        } else {
            params.x = screenWidth - chatHeadView.getWidth();
        }
        
        windowManager.updateViewLayout(chatHeadView, params);
    }

    private void openApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("openBee", currentBeeId);
        startActivity(intent);
        
        // Optionally hide chat head when app is opened
        hideChatHead();
    }

    private void hideChatHead() {
        if (chatHeadView != null) {
            windowManager.removeView(chatHeadView);
            chatHeadView = null;
        }
        stopForeground(true);
        stopSelf();
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent, 
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NotiBee")
            .setContentText("Chat head is active")
            .setSmallIcon(R.drawable.ic_stat_bee)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (chatHeadView != null) {
            windowManager.removeView(chatHeadView);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
