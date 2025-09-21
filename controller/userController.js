const userModel = require("../model/user");
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
// const { sendMail } = require("../middleware/email");
const { html } = require("../middleware/signUp");
const resendMail  = require('../middleware/resend')

exports.register = async (req, res) => {
    try {
        const { fullName, email, age, password, phoneNumber } = req.body
        const file = req.file;
        let response;
        const existingEmail = await userModel.findOne({ email: email.toLowerCase() });
        const existingPhoneNumber = await userModel.findOne({ phoneNumber: phoneNumber });

        // if(existingEmail || existingPhoneNumber) {
        //      fs.unlinkSync(file.path)
        //     return res.status(400).json({
        //         messasge: 'User already exists'
        //     })
        // }
        if (file && file.path) {
            response = await cloudinary.uploader.upload(file.path);
            fs.unlinkSync(file.path)
        }
        const saltRound = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, saltRound);

        const user = new userModel({
            fullName,
            email,
            password: hashPassword,
            age,
            phoneNumber,
            profiePicture: {
                publicId: response.public_id,
                imageUrl: response.secure_url
            }
        });
        await user.save()
        const subject = "Kindly Verify Your Email";
        const link = `${req.protocol}://${req.get('host')}/api/v1/verify/${user._id}`
        //             `<p>Hello <b>${fullName}<b>,</p>
        //             <p>Welcome to our platform </p>
        //             <p>Please click below to verify your email:</p>
        //             <a href= "https://localhost:8080/api/v1/verify/${user._id}">Verify Email<a/>`
        await resendMail({
            to: email,
            subject,
            // text,
            html: html(link, user.fullName)
        }).then(() => {
            console.log("Mail sent");
        }).catch((e) => {
            console.log(e);
        })
        res.status(201).json({
            message: "User created successfully",
            verify_account: `Click on Verification link sent to ${user.email}`,
            data: user
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const checkUser = await userModel.findByIdAndUpdate(id, { isVerified: true }, { new: true })
        if (!checkUser) {
            return res.status(404).json({ message: "User not found" })
        }

        if (checkUser.isVerified) {
            return res.status(400).json({
                message: 'Email already verified'
            })
        }
        re.status(200).json({
            message: "Email successfully verified"
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })

    }
}

exports.getOneUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        res.status(200).json({
            message: 'User retrieved successfully',
            data: user
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { fullName, age } = req.body;
        const { id } = req.params;
        const file = req.file;
        let response;
        const user = await userModel.findById(id);

        if (!user) {
            return res.status(404).json('User not found');
        };

        if (file && file.path) {
            await cloudinary.uploader.upload(file.path)
            fs.unlinkSync(file.path)
        }
        const userData = {
            fullName: fullName ?? user.fullName,
            age: age ?? user.age,
            profiePicture: {
                imageUrl: response?.secure_url,
                publicId: response?.public_id
            }
        };
        const newData = Object.assign(user, userData);
        const update = await userModel.findByIdAndUpdate(user._id, newData, { new: true });
        res.status(200).json({
            message: 'User updated successfully',
            data: update
        })
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
}