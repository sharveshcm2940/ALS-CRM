import serverless from "serverless-http";

// Classic Netlify Functions invoke Express rather than opening a listening port.
// Set production mode before importing cookie/database configuration.
process.env.NODE_ENV = "production";
process.env.NETLIFY = "true";
const application = import("../../server/app.js").then(({ app }) =>
  serverless(app),
);

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  const path =
    (event.path || "/").replace(/^\/\.netlify\/functions\/api(?=\/|$)/, "") ||
    "/";
  if (path !== "/api" && !path.startsWith("/api/")) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Endpoint not found." }),
    };
  }
  return (await application)({ ...event, path }, context);
}
