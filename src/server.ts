import { app } from './app.js'; // import the app from the app.ts file

const PORT = process.env.PORT || 3000; // get the port from the environment variable

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`); // log that the server is running
});
