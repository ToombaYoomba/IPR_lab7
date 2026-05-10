const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

let tasks = [];
let taskId = 1;

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'todo-api' });
});

app.get('/api/tasks', (req, res) => {
  res.json({ tasks: tasks, source: 'database' });
});

app.post('/api/tasks', (req, res) => {
  if (!req.body.title || req.body.title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newTask = {
    id: taskId++,
    title: req.body.title,
    completed: false,
    created_at: new Date().toISOString()
  };
  
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (typeof req.body.completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed field is required' });
  }
  
  task.completed = req.body.completed;
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  tasks.splice(index, 1);
  res.status(204).send();
});

describe('Todo API Integration Tests', () => {
  beforeEach(() => {
    tasks = [];
    taskId = 1;
  });

  describe('Health Check', () => {
    test('GET /api/health returns service status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('todo-api');
    });
  });

  describe('Task Management', () => {
    test('GET /api/tasks returns empty array initially', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(200);
      expect(response.body.tasks).toEqual([]);
      expect(response.body.source).toBe('database');
    });

    test('POST /api/tasks creates new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Learn Docker' });
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Learn Docker');
      expect(response.body.completed).toBe(false);
      expect(response.body.id).toBe(1);
    });

    test('POST /api/tasks rejects empty title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('PUT /api/tasks updates task completion', async () => {
      await request(app).post('/api/tasks').send({ title: 'Test task' });
      
      const response = await request(app)
        .put('/api/tasks/1')
        .send({ completed: true });
      
      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
    });

    test('DELETE /api/tasks removes task', async () => {
      await request(app).post('/api/tasks').send({ title: 'Task to delete' });
      
      const response = await request(app).delete('/api/tasks/1');
      expect(response.status).toBe(204);
      
      const getResponse = await request(app).get('/api/tasks');
      expect(getResponse.body.tasks).toHaveLength(0);
    });
  });
});