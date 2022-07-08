"use strict";

module.exports = async function (fastify, opts, next) {
  fastify.get("/get/:id", async (req, reply) => {
    const connection = await fastify.mysql.getConnection();
    const [rows, fields] = await connection.query(
      `SELECT uid, email, first_name, last_name, agency  FROM users_api WHERE uid = ${req.params.id}`
    );
    connection.release();

    if (rows.length) {
      reply.code(200).send(rows[0]);
      return;
    }
    reply.code(404).send({ message: "Not Found!", statusCode: "404" });
  });

  next();
};
