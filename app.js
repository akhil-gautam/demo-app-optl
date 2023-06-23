const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const opentelemetry = require('@opentelemetry/api');
const pidusage = require('pidusage');
const v8 = require('v8');

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(
    'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)'
  );
  db.run(
    'CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, product_name TEXT)'
  );
});

// Seed the database
db.serialize(() => {
  const insert = 'INSERT INTO users (name, email) VALUES (?, ?)';
  db.run(insert, ['John Doe', 'john@example.com']);
  db.run(insert, ['Jane Smith', 'jane@example.com']);

  const inserOrders =
    'INSERT INTO orders (user_id, product_name) VALUES (?, ?)';
  db.run(inserOrders, [1, 'Product 1']);
  db.run(inserOrders, [1, 'Product 2']);
  db.run(inserOrders, [2, 'Product 3']);
  db.run(inserOrders, [2, 'Product 4']);
});

const app = express();
const port = 3000;

// global error handler middleware
function errorHandler(err, req, res, next) {
  const tracer = opentelemetry.trace.getTracer('errorTracer');
  tracer.startActiveSpan('error', (span) => {
    span.setAttribute('component', 'errorHandler');
    span.setAttribute('errMsg', err.stack);
    span.setAttribute('errorCode', 1);
    span.setAttribute('route', `${req.method} ${req.route.path}`);
    span.end();
  });
  res.status(500).json({ error: 'Internal Server Error' });
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.send(rows);
    }
  });
});

app.get('/orders', (req, res) => {
  db.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.send(rows);
    }
  });
});

app.get('/products', (req, res) => {
  db.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.send(rows);
    }
  });
});

app.get('/users', (req, res) => {
  // to generate error data
  throw new Error('Something went wrong');
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.send(rows);
    }
  });
});

app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (!row) {
      res.status(500).json({ error: 'Not found' });
    } else {
      res.json({ row });
    }
  });
});

app.get('/orders/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
    if (!row) {
      res.status(500).json({ error: 'Not found' });
    } else {
      res.json({ row });
    }
  });
});

app.use(errorHandler);

const compute = async () => {
  const stats = await pidusage(process.pid);
  const tracer = opentelemetry.trace.getTracer('metricTracer');
  tracer.startActiveSpan('metric', (span) => {
    span.setAttribute('cpu', `${stats.cpu.toFixed(2)}%`);
    span.setAttribute(
      'memoryUsage',
      `${(stats.memory / 1024 / 1024).toFixed(2)} MB`
    );
    span.setAttribute(
      'heapUsage',
      (v8.getHeapStatistics().used_heap_size / 1024 / 1024).toFixed(2) + 'MB'
    );
    span.end();
  });
};

// Compute statistics every second:
const interval = async (time) => {
  setTimeout(async () => {
    await compute();
    interval(time);
  }, time);
};

interval(10000);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
