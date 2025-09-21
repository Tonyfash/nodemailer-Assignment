const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true,
        trim: true
    },
    email:{
        type: String,
        required: true,
        trim: true,
        // unique: true,
        lowercase: true
    },
    password:{
        type: String,
        required: true
    },
    age:{
        type: Number,
        required: true
    },
    profiePicture:{
        imageUrl:{type: String, required: true},
        publicId:{type: String, required: true}
    },
    phoneNumber:{
        type: String,
        required: true
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    token: {
        type: String,
        required: false
    }
}, {timestamps: true}
);

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;

