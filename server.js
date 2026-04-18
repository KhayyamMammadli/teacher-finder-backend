const app = require('./src/app');

const envPort = Number(process.env.PORT);
const PORT = envPort && envPort !== 5000 ? envPort : 5050;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});