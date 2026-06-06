const fs = require('fs');
const path = require('path');

const DB_FILE = '/tmp/tasks.json';

const readTasks = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([
      { id: 1, title: "Welcome to TaskMaster CLI!", completed: false, date: "2026-6-6" }
    ]));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
};

const writeTasks = (tasks) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(tasks, null, 2));
};

module.exports = (req, res) => {
  const { method } = req;
  const tasks = readTasks();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method === 'GET') {
    return res.status(200).json(tasks);
  }

  if (method === 'POST') {
    const newTask = {
      id: Date.now(),
      title: req.body.title,
      completed: false,
      date: req.body.date || ""
    };
    tasks.push(newTask);
    writeTasks(tasks);
    return res.status(201).json(newTask);
  }

  if (method === 'PUT') {
    const urlParts = req.url.split('/');
    const id = parseInt(urlParts[urlParts.length - 1]);
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...req.body };
      writeTasks(tasks);
      return res.status(200).json(tasks[index]);
    }
    return res.status(404).json({ error: "Not found", id, url: req.url });
  }

  if (method === 'DELETE') {
    const urlParts = req.url.split('/');
    const id = parseInt(urlParts[urlParts.length - 1]);
    const newTasks = tasks.filter(t => t.id !== id);
    writeTasks(newTasks);
    return res.status(204).end();
  }

  res.status(405).json({ error: "Method not allowed" });
};
