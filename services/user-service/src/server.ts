import app from './app';

const PORT = parseInt(process.env.PORT ?? '4001', 10);
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'user-service-unknown';

app.listen(PORT, () => {
  console.log(`[${INSTANCE_ID}] User Service running on port ${PORT}`);
});
