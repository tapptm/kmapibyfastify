const mysql = require("@fastify/mysql");
const mysqlOption = require("./config/mysql.db");
const users = require("./services/users");
const knowledge = require("./services/knowledges");

module.exports = function (fastify, opts, next) {
  fastify.register(mysql, mysqlOption);

  fastify.register(users, { prefix: "/users" });
  fastify.register(knowledge, { prefix: "/knowledges" });

  next();
};
