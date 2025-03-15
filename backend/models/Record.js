const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    name: { type: String, required: true },
    idNumber: { type: String, required: true },
    bmi: { type: Number, required: true },
    icc: { type: Number, required: true },
    gender: { type: String, required: true },
    age: { type: Number, required: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia al modelo User
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Record', recordSchema);