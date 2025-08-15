const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const meditationsRouter = require('./routes/meditations');
const sessionsRouter = require('./routes/sessions');
const statsRouter = require('./routes/stats');
const healthRouter = require('./routes/health');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/meditations', meditationsRouter);
app.use('/sessions', sessionsRouter);
app.use('/stats', statsRouter);
app.use('/health', healthRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;