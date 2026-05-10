const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const client = require('prom-client');

// OpenTelemetry — включается только если задана переменная OTEL_EXPORTER_OTLP_ENDPOINT
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
    const { Resource } = require('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
    const sdk = new NodeSDK({
      resource: new Resource({ [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'todo-backend' }),
      traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces' }),
      instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
    });
    sdk.start();
    console.log('OpenTelemetry tracing enabled');
  } catch (e) {
    console.warn('OpenTelemetry init failed:', e.message);
  }
}

// Prometheus метрики
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [register],
});

const tasksTotal = new client.Gauge({
  name: 'tasks_total',
  help: 'Current number of tasks in DB',
  registers: [register],
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware замера запросов
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    end();
  });
  next();
});

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

const redisClient = redis.createClient({
  url: 'redis://' + (process.env.REDIS_HOST || 'cache') + ':' + (process.env.REDIS_PORT || 6379),
});
redisClient.connect().catch(console.error);

const initDB = async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, completed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
};

const updateTasksMetric = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM tasks');
    tasksTotal.set(parseInt(result.rows[0].count, 10));
  } catch (_) {}
};

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', async (req, res) => {
  try {
    const cached = await redisClient.get('tasks');
    if (cached) return res.json({ tasks: JSON.parse(cached), source: 'cache' });
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    await redisClient.setEx('tasks', 30, JSON.stringify(result.rows));
    res.json({ tasks: result.rows, source: 'database' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title } = req.body;
    const result = await pool.query('INSERT INTO tasks (title) VALUES ($1) RETURNING *', [title]);
    await redisClient.del('tasks');
    updateTasksMetric();
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const result = await pool.query('UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *', [completed, id]);
    await redisClient.del('tasks');
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    await redisClient.del('tasks');
    updateTasksMetric();
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  initDB().then(() => {
    setInterval(updateTasksMetric, 30000);
    app.listen(PORT, '0.0.0.0', () => {
      console.log('Backend running on port ' + PORT);
      console.log('Metrics: http://localhost:' + PORT + '/metrics');
    });
  });
}
module.exports = app;
