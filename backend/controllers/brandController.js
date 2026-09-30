const BrandSettings = require('../models/BrandSettings');
const asyncHandler = require('../utils/asyncHandler');
const { coachIdOf, validationError } = require('../utils/request');
const { validateBrand, hasErrors, DEFAULT_BRAND_COLOR } = require('../../shared/validation');

const DEFAULT_BRAND = {
    businessName: '',
    coachName: '',
    phone: '',
    email: '',
    contactExtra: '',
    primaryColor: DEFAULT_BRAND_COLOR,
    logo: null,
};

// GET /api/brand — configuración del entrenador (valores por defecto si aún no existe).
const getBrand = asyncHandler(async (req, res) => {
    const brand = await BrandSettings.findOne({ coachId: coachIdOf(req) }).lean();
    res.json(brand || DEFAULT_BRAND);
});

// PUT /api/brand
const saveBrand = asyncHandler(async (req, res) => {
    const { value, errors } = validateBrand(req.body);
    if (hasErrors(errors)) return validationError(res, 'Revisa la configuración de marca.', errors);
    const coachId = coachIdOf(req);
    const brand = await BrandSettings.findOneAndUpdate(
        { coachId },
        { $set: value, $setOnInsert: { coachId } },
        { new: true, upsert: true, runValidators: true },
    );
    res.json(brand);
});

module.exports = { getBrand, saveBrand };
