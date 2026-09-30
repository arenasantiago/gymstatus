const mongoose = require('mongoose');
const { TEXT_LIMITS, DEFAULT_BRAND_COLOR } = require('../../shared/validation');

/**
 * Marca del entrenador (una por cuenta): se usa en la ficha PDF. Funciona
 * igual para un preparador independiente, una academia, un club o un centro
 * de rendimiento.
 */
const brandSettingsSchema = new mongoose.Schema(
    {
        coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        businessName: { type: String, default: '', maxlength: TEXT_LIMITS.businessName },
        coachName: { type: String, default: '', maxlength: TEXT_LIMITS.coachName },
        phone: { type: String, default: '', maxlength: TEXT_LIMITS.phone },
        email: { type: String, default: '', maxlength: TEXT_LIMITS.email },
        contactExtra: { type: String, default: '', maxlength: TEXT_LIMITS.contactExtra },
        primaryColor: { type: String, default: DEFAULT_BRAND_COLOR, match: /^#[0-9A-F]{6}$/ },
        // Data URI (PNG/JPEG). SVG no se acepta: puede contener scripts.
        logo: { type: String, default: null },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model('BrandSettings', brandSettingsSchema);
