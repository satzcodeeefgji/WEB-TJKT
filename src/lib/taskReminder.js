const { WAConnection, MessageType } = require('@adiwajshing/baileys');
const schedule = require('node-schedule');
const tasks = require('../data/tasks.json'); // Contoh data tugas

// Inisialisasi koneksi WhatsApp
const conn = new WAConnection();

async function connectWhatsApp() {
  await conn.connect();
  console.log('WhatsApp connected');
}

connectWhatsApp();

// Fungsi untuk mengirim pesan ke grup
async function sendReminder(groupId, message) {
  await conn.sendMessage(groupId, message, MessageType.text);
  console.log('Reminder sent:', message);
}

// Jadwalkan pengingat tugas
function scheduleReminders() {
  tasks.forEach((task) => {
    const reminderDate = new Date(task.deadline);
    reminderDate.setDate(reminderDate.getDate() - 2); // 2 hari sebelum deadline

    schedule.scheduleJob(reminderDate, () => {
      const message = `Pengingat: Tugas "${task.title}" akan jatuh tempo pada ${task.deadline}. Mohon segera diselesaikan.`;
      sendReminder(task.groupId, message);
    });
  });
}

scheduleReminders();

module.exports = { scheduleReminders };