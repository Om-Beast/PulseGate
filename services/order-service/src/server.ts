import app from './app';

const PORT = parseInt(process.env.PORT ?? '4011', 10);
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'order-service-unknown';

app.listen(PORT, () => {
  console.log(`[${INSTANCE_ID}] Order Service running on port ${PORT}`);
});
