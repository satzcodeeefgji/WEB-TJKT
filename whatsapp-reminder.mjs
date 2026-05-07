import fs from 'fs/promises';
import qrcode from 'qrcode-terminal';
import schedule from 'node-schedule';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth, MessageMedia } = pkg.default ?? pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const configFile = join(__dirname, 'whatsapp-bot-config.json');
const authDir = join(__dirname, process.env.WHATSAPP_AUTH_DIR || '.wwebjs_auth');
const sessionFile = join(__dirname, 'whatsapp-session.json');

const TASK_PHOTO_BUCKET = 'documentation';

function taskPhotoPublicUrl(path) {
  return supabase.storage.from(TASK_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://vvvnwkdosyartgoyqqgx.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_79wo6pd9EUEddeHF8tRHRA_vHb2FReh';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultConfig = {
  groupId: null,
  sentReminders: [],
};

async function loadConfig() {
  try {
    const raw = await fs.readFile(configFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { ...defaultConfig };
  }
}

async function saveConfig(config) {
  await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
}

function formatDate(date) {
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function sendMessage(client, groupId, message, media = null) {
  if (!groupId) {
    console.warn('Grup tujuan reminder belum diatur. Gunakan perintah !setgb di grup target terlebih dahulu.');
    return;
  }

  try {
    if (media) {
      await client.sendMessage(groupId, media, { caption: message });
    } else {
      await client.sendMessage(groupId, message);
    }
    console.log(`Pesan reminder terkirim ke ${groupId}`);
  } catch (error) {
    console.error('Gagal mengirim pesan reminder:', error.message ?? error);
  }
}

async function scheduleTaskReminders(client, config) {
  const tasks = await fetchTasks();
  const now = new Date();
  const jobs = [];

  for (const task of tasks) {
    if (!task.deadline) continue;
    const deadline = new Date(task.deadline);
    if (Number.isNaN(deadline.getTime())) continue;

    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - 1);

    if (config.sentReminders.includes(task.id)) continue;

    const formattedMessage = `📣 *Peringatan Tugas 24 Jam*\n\n` +
      `*${task.title}*\n` +
      `Deadline: *${formatDate(deadline)}*` +
      `${task.description ? `\n\n${task.description}` : ''}` +
      `\n\nPastikan tugas selesai sebelum waktunya habis.`;

    const sendReminder = async () => {
      let media = null;
      if (Array.isArray(task.photo_paths) && task.photo_paths.length > 0) {
        const imageUrl = taskPhotoPublicUrl(task.photo_paths[0]);
        if (imageUrl) {
          try {
            media = await MessageMedia.fromUrl(imageUrl);
          } catch (error) {
            console.warn('Gagal mengambil foto tugas untuk reminder, mengirim teks saja.', error.message ?? error);
          }
        }
      }

      await sendMessage(client, config.groupId, formattedMessage, media);
      config.sentReminders.push(task.id);
      await saveConfig(config);
    };

    if (reminderDate <= now && deadline > now) {
      console.log(`Reminder untuk tugas '${task.title}' sudah melewati waktunya, mengirim sekarang.`);
      await sendReminder();
      continue;
    }

    if (reminderDate <= now) continue;

    const job = schedule.scheduleJob(reminderDate, async () => {
      await sendReminder();
    });

    jobs.push(job);
    console.log(`Dijadwalkan reminder tugas '${task.title}' untuk ${formatDate(reminderDate)}.`);
  }

  return jobs;
}

async function refreshSchedules(client, config, jobs) {
  jobs.forEach((job) => job.cancel());
  return scheduleTaskReminders(client, config);
}

async function initBot() {
  const config = await loadConfig();
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'tugas-reminder', dataPath: authDir }),
    puppeteer: {
      headless: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        process.env.CHROME_PATH ||
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
  });

  let scheduledJobs = [];

  client.on('qr', (qr) => {
    console.log('Scan QR code WA berikut untuk menghubungkan bot:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', async (session) => {
    console.log('WhatsApp berhasil diautentikasi. Session tersimpan.');
    if (session) {
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf8');
      console.log(`Session backup disimpan ke ${sessionFile}`);
    }
  });

  client.on('ready', async () => {
    console.log('WhatsApp bot siap.');
    try {
      scheduledJobs = await refreshSchedules(client, config, scheduledJobs);
      console.log('Scheduler tugas siap.');
    } catch (error) {
      console.error('Gagal menjadwalkan reminder tugas:', error.message ?? error);
    }

    setInterval(async () => {
      try {
        scheduledJobs = await refreshSchedules(client, config, scheduledJobs);
        console.log('Reminder tugas diperbarui otomatis.');
      } catch (error) {
        console.error('Gagal memperbarui reminder otomatis:', error.message ?? error);
      }
    }, 1000 * 60 * 5); // refresh setiap 5 menit
  });

  client.on('message_create', async (message) => {
    const body = message.body?.trim();
    if (!body) return;

    const normalized = body.toLowerCase();
    const chat = await message.getChat();
    const isGroup = chat.isGroup;

    if (normalized === '!setgb') {
      if (!isGroup) {
        await message.reply('Perintah !setgb harus dikirim dari grup WhatsApp yang akan menerima reminder.');
        return;
      }

      config.groupId = message.from;
      await saveConfig(config);
      await message.reply(`Grup ini telah disimpan sebagai tujuan reminder. ID grup: ${config.groupId}`);
      console.log(`Target reminder disimpan: ${config.groupId}`);
      return;
    }

    if (normalized === '!getgb') {
      await message.reply(
        config.groupId
          ? `Grup reminder saat ini: ${config.groupId}`
          : 'Belum ada grup target. Gunakan !setgb di grup target terlebih dahulu.'
      );
      return;
    }

    if (normalized === '!refreshtasks') {
      try {
        scheduledJobs = await refreshSchedules(client, config, scheduledJobs);
        await message.reply('Pengingat tugas berhasil diperbarui.');
      } catch (error) {
        await message.reply(`Gagal memperbarui reminder: ${error.message ?? error}`);
      }
      return;
    }
  });

  client.on('auth_failure', (message) => {
    console.error('Auth gagal:', message);
  });

  client.on('disconnected', () => {
    console.log('WhatsApp bot terputus.');
  });

  await client.initialize();
}

initBot().catch((error) => {
  console.error('Bot WA gagal dijalankan:', error.message ?? error);
});
