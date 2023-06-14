const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const {
  ExpressInstrumentation,
} = require('@opentelemetry/instrumentation-express');
const opentelemetry = require('@opentelemetry/api');
const { Resource } = require('@opentelemetry/resources');
const {
  SemanticResourceAttributes,
} = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const {
  BatchSpanProcessor,
} = require('@opentelemetry/sdk-trace-base');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');

const collectorOptions = {
  // url should be the URL of the optl-microservice
  // that is: https://github.com/akhil-gautam/optl-micro-service

  url: 'http://localhost:3001/traces',
  concurrencyLimit: 10, // an optional limit on pending requests
};

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'express-app-sqlite',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  })
);

const provider = new NodeTracerProvider({
  resource: resource,
});
const exporter = new OTLPTraceExporter(collectorOptions);
const processor = new BatchSpanProcessor(exporter);

provider.addSpanProcessor(processor);
provider.register();
opentelemetry.trace.setGlobalTracerProvider(provider);

module.exports = {
  provider,
};
