"use strict";

// netlify/functions/ping.cjs
var startedAt = Date.now();
exports.handler = async (event) => {
  const body = JSON.stringify({
    status: "ok",
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startedAt) / 1e3),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store"
    },
    body
  };
};
