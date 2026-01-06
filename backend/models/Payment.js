// Payment model deprecated — payment functionality removed. Keeping a minimal schema
// so existing documents remain accessible without runtime errors.
const mongoose = require('mongoose');

const deprecatedPaymentSchema = new mongoose.Schema({
  archived: { type: Boolean, default: true },
  legacyData: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('Payment', deprecatedPaymentSchema);