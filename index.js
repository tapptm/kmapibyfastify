const fastify = require("fastify")();
const routes = require("./app");

fastify.register(routes, { prefix: "/api/v2" });

fastify.listen({ port: 3007 }, (err) => {
  if (err) throw err;
  console.log(`server listening on ${fastify.server.address().port}`);
});
