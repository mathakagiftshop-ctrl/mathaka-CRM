import { Router } from 'express';
import webpush from 'web-push';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Configure web-push with VAPID keys
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:' + (process.env.VAPID_EMAIL || 'admin@mathakagifts.com'),
        vapidPublicKey,
        vapidPrivateKey
    );
}

// Get VAPID public key for frontend
router.get('/vapid-public-key', (req, res) => {
    if (!vapidPublicKey) {
        return res.status(500).json({
            error: 'Push notifications not configured. Generate VAPID keys first.'
        });
    }
    res.json({ publicKey: vapidPublicKey });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        // Upsert subscription (update if exists)
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: req.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                last_used_at: new Date().toISOString()
            }, {
                onConflict: 'endpoint'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, subscription: data });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req, res) => {
    try {
        const { endpoint } = req.body;

        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', req.user.id)
            .eq('endpoint', endpoint);

        res.json({ success: true });
    } catch (err) {
        console.error('Push unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Send push notification (internal use)
export async function sendPushNotification(userId, notification) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('VAPID keys not configured, skipping push notification');
        return { sent: 0, failed: 0 };
    }

    try {
        // Get all subscriptions for this user
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (!subscriptions || subscriptions.length === 0) {
            return { sent: 0, failed: 0 };
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon.svg',
            badge: '/icon.svg',
            tag: notification.tag || 'default',
            data: notification.data || {}
        });

        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                sent++;

                // Update last used timestamp
                await supabase
                    .from('push_subscriptions')
                    .update({ last_used_at: new Date().toISOString() })
                    .eq('id', sub.id);
            } catch (err) {
                failed++;
                // Remove invalid subscriptions (expired or unsubscribed)
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', sub.id);
                }
            }
        }

        return { sent, failed };
    } catch (err) {
        console.error('Send push notification error:', err);
        return { sent: 0, failed: 0 };
    }
}

// Send push to all users (for system notifications)
export async function broadcastPushNotification(notification) {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('id');

        let totalSent = 0;
        let totalFailed = 0;

        for (const user of users || []) {
            const result = await sendPushNotification(user.id, notification);
            totalSent += result.sent;
            totalFailed += result.failed;
        }

        return { sent: totalSent, failed: totalFailed };
    } catch (err) {
        console.error('Broadcast push error:', err);
        return { sent: 0, failed: 0 };
    }
}

// Test push notification (for debugging)
router.post('/test', authenticate, async (req, res) => {
    try {
        const result = await sendPushNotification(req.user.id, {
            title: '🎉 Test Notification',
            body: 'Push notifications are working!',
            tag: 'test'
        });

        res.json({
            success: true,
            message: `Sent ${result.sent} notification(s), ${result.failed} failed`
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

// Get user's notification preferences
router.get('/status', authenticate, async (req, res) => {
    try {
        const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('id, created_at, last_used_at')
            .eq('user_id', req.user.id);

        res.json({
            enabled: subscriptions && subscriptions.length > 0,
            subscriptions: subscriptions || []
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get push status' });
    }
});

export default router;
