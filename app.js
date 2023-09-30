const express = require('express');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector-grpc');
const prometheus = require('prom-client'); // Import the prom-client library

const app = express();

const tracerProvider = new NodeTracerProvider();

// Create the OpenTelemetry Collector exporter
const collectorExporter = new CollectorTraceExporter({
  serviceName: 'my-node-service',
  url: 'http://otel-collector:4317', // Use the OpenTelemetry Collector's hostname
});

// Set up span processing and exporting
const spanProcessor = new SimpleSpanProcessor(collectorExporter);
tracerProvider.addSpanProcessor(spanProcessor);

// Add the Prometheus exporter to the global registry
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

// Define a function to collect and return Prometheus metrics
async function getPrometheusMetrics() {
  try {
    const metrics = await prometheus.register.metrics();
    return metrics;
  } catch (error) {
    console.error('Error collecting Prometheus metrics:', error);
    return '';
  }
}

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getPrometheusMetrics();
    res.set('Content-Type', prometheus.register.contentType);
    res.end(metrics);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
})

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
