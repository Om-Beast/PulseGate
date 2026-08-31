import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import healthRoute from './routes/healthRoute';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoute);
app.use('/users', userRoutes);

export default app;
