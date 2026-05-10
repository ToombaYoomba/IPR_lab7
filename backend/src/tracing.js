'use strict';

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
    const { Resource } = require('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'todo-backend',
      }),
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
      }),
      instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
    });
    sdk.start();
    console.log('OpenTelemetry tracing enabled');
  } catch (e) {
    console.warn('OpenTelemetry init failed:', e.message);
  }
}
