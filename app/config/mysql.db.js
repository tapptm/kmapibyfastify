module.exports = {
  host: process.env.MYSQL_HOST || "143.198.86.6",
  port: process.env.MYSQL_PORT || "3306",
  database: process.env.MYSQL_DATABASE || "kminnovations",
  user: process.env.MYSQL_USER || "kminnovations",
  password: process.env.MYSQL_PASSWORD || "-kminnovation2021+",
  promise: true,
};
