import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectToMongoDB } from './config/database';
import { config } from './config/process';

// import authRoutes from './routes/authRoutes';
import authRoutes from './routes/AuthRouter';

import {
    errorHandler,
    notFound,
} from './middleware/errorMiddleware';
import { requestLogger } from './middleware/loggingMiddleware';
import cookieParser from 'cookie-parser';

class Server {
    private app: express.Application;
    private port: number | string;

    constructor() {
        this.app = express();
        this.port = config.port || 3000;

        this.initializeDatabase();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private async initializeDatabase(): Promise<void> {
        try {
            await connectToMongoDB();
            console.log('✅ База данных подключена');
        } catch (error) {
            console.error('❌ Подключение к базе данных вызвало ошибку:', error);
            process.exit(1);
        }
    }

    private initializeMiddlewares(): void {
        // Cookie-parser
        this.app.use(cookieParser());
        
        // Security middleware
        this.app.use(helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" }
        }));

        // CORS
        this.app.use(cors({
            origin: config.clientUrl || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Logging
        if (config.nodeEnv === 'dev') {
            this.app.use(morgan('dev'));
        } else {
            this.app.use(morgan('combined'));
        }

        // Custom request logger
        this.app.use(requestLogger);

        // Health check logger
        this.app.use((req, res, next) => {
            if (req.path === '/health') {
                console.log('🏥 Health check requested');
            }
            next();
        });
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Server is healthy',
                timestamp: new Date().toISOString(),
                environment: config.nodeEnv || 'development',
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API routes
        this.app.use('/api/auth', authRoutes);
        // this.app.use('/api/users', userRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: '🎵 Sound Server API',
                // documentation: '/api/docs',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            });
        });

        // API info endpoint
        this.app.get('/api', (req, res) => {
            res.json({
                success: true,
                message: 'Sound Server API',
                endpoints: {
                    //   auth: {
                    //     register: 'POST /api/auth/register',
                    //     login: 'POST /api/auth/login',
                    //     logout: 'POST /api/auth/logout',
                    //     refresh: 'POST /api/auth/refresh'
                    //   },
                    //   users: {
                    //     profile: 'GET /api/users/profile',
                    //     updateProfile: 'PUT /api/users/profile',
                    //     getUser: 'GET /api/users/:id',
                    //     updateUser: 'PUT /api/users/:id',
                    //     deleteUser: 'DELETE /api/users/:id',
                    //     follow: 'POST /api/users/:id/follow',
                    //     unfollow: 'POST /api/users/:id/unfollow'
                    //   }
                }
            });
        });
    }

    private initializeErrorHandling(): void {
        // Handle 404 - Route not found
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err: Error) => {
            console.error('❌ Unhandled Promise Rejection:', err);
            // In production, you might want to exit the process
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err: Error) => {
            console.error('❌ Uncaught Exception:', err);
            process.exit(1);
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`
🚀 Sound Server started successfully!

📍 Environment: ${config.nodeEnv || 'development'}
📡 Server URL: http://localhost:${this.port}
📊 Database: ${config.mongodbUri?.replace(/:[^:]*@/, ':****@')}
⏰ Started at: ${new Date().toISOString()}

📚 Available endpoints:
   • Health check: GET /health
   • API info: GET /api
   • Auth routes: /api/auth
   • User routes: /api/users

🔍 Debug info:
   • Node.js: ${process.version}
   • Platform: ${process.platform}/${process.arch}
      `);
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}

// Create and start server
const server = new Server();

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

    // Give some time for ongoing requests to complete
    setTimeout(() => {
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    }, 5000);
};

// Listen for shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the server
server.start();

export default server;