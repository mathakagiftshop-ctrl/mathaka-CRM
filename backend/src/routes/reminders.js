import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { sendPushNotification } from './push.js';

const router = Router();

// Check for upcoming dates and send reminders
// This endpoint should be called by a cron job daily (e.g., at 7 AM)
router.get('/check', async (req, res) => {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const today = new Date();
        const results = {
            checked: 0,
            reminders_sent: 0,
            push_notifications: { sent: 0, failed: 0 },
            dates: []
        };

        // Get all important dates with reminder settings
        const { data: dates } = await supabase
            .from('important_dates')
            .select(`
        *,
        customers (id, name, whatsapp),
        recipients (name)
      `)
            .eq('recurring', true);

        if (!dates || dates.length === 0) {
            return res.json({ ...results, message: 'No dates to check' });
        }

        // Get all users to send notifications to
        const { data: users } = await supabase
            .from('users')
            .select('id');

        for (const date of dates) {
            results.checked++;

            // Parse the date (format: YYYY-MM-DD or MM-DD)
            const dateMonthDay = date.date.substring(5); // Get MM-DD part
            const [month, day] = dateMonthDay.split('-').map(Number);

            // Calculate target date for this year
            let targetDate = new Date(today.getFullYear(), month - 1, day);

            // If date has passed this year, check next year
            if (targetDate < today) {
                targetDate = new Date(today.getFullYear() + 1, month - 1, day);
            }

            // Calculate days until the event
            const diffTime = targetDate - today;
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if we should send a reminder (using reminder_days setting)
            const reminderDays = date.reminder_days || 7;

            // Send reminder if days until matches reminder_days OR if it's today
            const shouldRemind = daysUntil === reminderDays || daysUntil === 0;

            // Check if we already sent a reminder recently (within 24 hours)
            if (date.reminder_sent_at) {
                const lastReminder = new Date(date.reminder_sent_at);
                const hoursSinceReminder = (today - lastReminder) / (1000 * 60 * 60);
                if (hoursSinceReminder < 24) {
                    continue; // Skip, already reminded today
                }
            }

            if (shouldRemind) {
                const customerName = date.customers?.name || 'Unknown';
                const recipientName = date.recipients?.name;

                // Create notification for all users
                for (const user of users || []) {
                    // Store in-app notification
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: user.id,
                            type: 'reminder',
                            title: daysUntil === 0
                                ? `🎉 TODAY: ${date.title}`
                                : `📅 Upcoming: ${date.title}`,
                            message: `${customerName}${recipientName ? ` → ${recipientName}` : ''} - ${daysUntil === 0 ? 'Today!' : `in ${daysUntil} days`}`,
                            related_entity_type: 'important_date',
                            related_entity_id: date.id
                        });

                    // Send push notification
                    const pushResult = await sendPushNotification(user.id, {
                        title: daysUntil === 0
                            ? `🎉 ${date.title} is TODAY!`
                            : `📅 ${date.title} in ${daysUntil} days`,
                        body: `${customerName}${recipientName ? ` → ${recipientName}` : ''}. Don't forget to reach out!`,
                        tag: `reminder-${date.id}`,
                        data: {
                            url: `/important-dates`,
                            dateId: date.id,
                            customerId: date.customer_id
                        }
                    });

                    results.push_notifications.sent += pushResult.sent;
                    results.push_notifications.failed += pushResult.failed;
                }

                // Update reminder_sent_at
                await supabase
                    .from('important_dates')
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .eq('id', date.id);

                results.reminders_sent++;
                results.dates.push({
                    id: date.id,
                    title: date.title,
                    customer: customerName,
                    daysUntil
                });
            }
        }

        res.json({
            success: true,
            ...results,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Reminder check error:', err);
        res.status(500).json({ error: 'Failed to check reminders', details: err.message });
    }
});

// Get user's notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authenticate, async (req, res) => {
    try {
        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', req.user.id)
            .is('read_at', null);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// Get unread count
router.get('/notifications/unread-count', authenticate, async (req, res) => {
    try {
        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', req.user.id)
            .is('read_at', null);

        res.json({ count: count || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

export default router;
