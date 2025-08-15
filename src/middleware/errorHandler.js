module.exports = function errorHandler(err, req, res, next) {
  const status = err && err.status ? err.status : 500;
  const message = err && err.message ? err.message : 'Internal Server Error';

  if (status >= 500) {
    // Log server errors
    console.error(err);
  }

  res.status(status).json({ error: message });
};