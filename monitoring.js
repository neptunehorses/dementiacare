const promClient = require('prom-client');
const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestDurationMicroseconds);

module.exports = { register, httpRequestDurationMicroseconds }; 