import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes';
import healthRoute from './routes/healthRoute';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoute);
app.use('/orders', orderRoutes);

export default app;
