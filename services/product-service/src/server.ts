import app from './app';

const PORT = parseInt(process.env.PORT ?? '4021', 10);
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'product-service-unknown';

app.listen(PORT, () => {
  console.log(`[${INSTANCE_ID}] Product Service running on port ${PORT}`);
});
