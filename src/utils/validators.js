function requireFields(obj, fields) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

module.exports = {
  requireFields,
  isPositiveInteger,
};