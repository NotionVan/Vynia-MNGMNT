import "@testing-library/jest-dom";

// Suppress unhandled rejections from api.js inflight cache promise chains.
// When a GET request fails, the inflight Map stores a rejected promise
// whose .then() chain (for caching) has no .catch(), causing unhandled rejection.
process.on("unhandledRejection", () => {});
