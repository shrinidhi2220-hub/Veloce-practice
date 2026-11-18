const app = require('./app');
const { prisma, testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

let server;
let shuttingDown = false;

async function startServer() {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    throw new Error(
      'Database unavailable. VELOCE server startup aborted.'
    );
  }

  server = app.listen(PORT, () => {
    console.log(`VELOCE Backend Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API URL: http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('HTTP server error:', error.message);
    process.exitCode = 1;
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;
  console.log(`${signal} received. Shutting down VELOCE...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await prisma.$disconnect();
    console.log('VELOCE shutdown completed.');
  } catch (error) {
    console.error('Shutdown error:', error.message);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch(async error => {
  console.error('VELOCE startup failed:', error.message);

  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('Database disconnect failed:', disconnectError.message);
  }

  process.exitCode = 1;
});
