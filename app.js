const express = require("express");
const app = express();
const total = (precio, cant, desc) =>
  precio * cant * (1 - desc);
app.get("/total", (req, res) => {
  const { p, c } = req.query;
  res.json({ total: total(p, c, 0) });
});
app.get("/calcular", (req, res) => {
  const resultado = Number(req.query.a) + Number(req.query.b);
  res.json({ resultado });
});
module.exports = { app, total };
// Reto 3 (ZAP): arranca el servidor solo al ejecutar `node app.js`, no al importar en el test
if (require.main === module) {
  app.listen(3000);
}
