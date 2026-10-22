const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const errorHandler = require('./middleware/errorHandler');

// Routes imports
const authRouter = require('./routes/authRoutes');
const profileRouter = require('./routes/profileRoutes');
const startupRouter = require('./routes/startupRoutes');
const dashboardRouter = require('./routes/dashboardRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const aiRouter = require('./routes/aiRoutes');
const matchRouter = require('./routes/matchRoutes');
const applicationRouter = require('./routes/applicationRoutes');
const messageRouter = require('./routes/messageRoutes');
const investorRouter = require('./routes/investorRoutes');
const adminRouter = require('./routes/adminRoutes');
const reportRouter = require('./routes/reportRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const jobRouter = require('./routes/jobRoutes');
const resumeRouter = require('./routes/resumeRoutes');
const workspaceRouter = require('./routes/workspaceRoutes');
const fundraisingRouter = require('./routes/fundraisingRoutes');

const app = express();





// 1. GLOBAL MIDDLEWARES

// Set security HTTP headers
const frameAncestors = ["'self'", "http://localhost:5173"];
if (process.env.FRONTEND_URL) {
  frameAncestors.push(process.env.FRONTEND_URL);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": frameAncestors,
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: false
  })
);

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting: Limit requests from same IP to 200 per 15 minutes
const limiter = rateLimit({
  max: 200,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);

// CORS configuration (allow requests from frontend)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '5mb' }));

// Cookie parser, reading cookies from headers
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Serve uploads folder statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. MOUNT ROUTES
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/profiles', profileRouter);
app.use('/api/v1/startups', startupRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/match', matchRouter);
app.use('/api/v1/applications', applicationRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/investor', investorRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/jobs', jobRouter);
app.use('/api/v1/resumes', resumeRouter);
app.use('/api/v1/workspace', workspaceRouter);
app.use('/api/v1/fundraising', fundraisingRouter);





// 3. UNHANDLED ROUTES ROUTER
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4. GLOBAL ERROR HANDLER
app.use(errorHandler);

module.exports = app;
