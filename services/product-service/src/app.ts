import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes';
import healthRoute from './routes/healthRoute';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoute);
app.use('/products', productRoutes);

export default app;
