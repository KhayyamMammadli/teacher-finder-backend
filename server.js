const app = require('./src/app');

const envPort = Number(process.env.PORT);
const PORT = Number.isFinite(envPort) && envPort > 0 ? envPort : 5050;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});