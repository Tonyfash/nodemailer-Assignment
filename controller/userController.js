const userModel = require("../model/user");
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const { sendMail } = require("../middleware/email");
const { html } = require("../middleware/signUp");
// const resendMail  = require('../middleware/resend');
const jwt = require('jsonwebtoken');
const { forgotHtml } = require("../middleware/forgot");
const { sendingMail } = require("../middleware/mailgun");

exports.register = async (req, res) => {
    try {
        const { fullName, email, age, password, phoneNumber } = req.body;
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
        // await user.save()
        const subject = "Kindly Verify Your Email";
        const link = `${req.protocol}://${req.get('host')}/api/v1/verify/${user._id}`
        //             `<p>Hello <b>${fullName}<b>,</p>
        //             <p>Welcome to our platform </p>
        //             <p>Please click below to verify your email:</p>
        //             <a href= "https://localhost:8080/api/v1/verify/${user._id}">Verify Email<a/>`
        await sendingMail({
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
        console.log(error)
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

exports.login = async (req, res) => {
    try {
        // Extract email and password from the request body
        const {email, password} = req.body;
        // Check for user in the DB using email(trimmed and lowercased) 
        const checkUser = await userModel.findOne({email: email.toLowerCase().trim()});
        // Compare the provided password with the hashed pasword in the database
        const checkPassword = await bcrypt.compare(password, checkUser.password)
        // If no user OR incorrect password return a response "invalid credentials"
        if(!checkUser || !checkPassword){
            return res.status(400).json({message: "Invalid credentials"});
        }
        // Generate a JWT token for the user that expires in 2 minutes
        const token = jwt.sign({id: checkUser._id}, "secretKey", {expiresIn: "2m"});
        // Send a successful response with User's data and token
        res.status(200).json({
            message: 'Login successful',
            data: checkUser,
            token
        })
    } catch (error) {
        // Handles any unexpected server error
       console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        }) 
    }
};

exports.home = async (req, res) => {
    try {
        // Extract token from the request headers
        const checkToken = req.headers.authorization;
        //  if no token, User will be required to login
        if(!checkToken) {
            return res.status(400).json("Login required")
        };
        // Remove "Bearer" prefx and gets only the token
        const token = req.headers.authorization.split(" ")[1];
        // Verify the token with a secret key 
        jwt.verify(token, "secretKey", async(err, result)=>{
            //  if error send an error response message  of "Invalid token" else send a welcome response message
            if(err){
                res.status(400).json({error: err.message})
            } else{
                // if valid, check user by id inside token
                const checkcUser = await userModel.findById(result.id)
                res.status(200).json(`Welcome ${checkcUser.fullName}, we are happy to have you here`);
            }
        })
    } catch (error) {
        // Handles any unexpected server error
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })         
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        // Extract email from the request body
        const {email} = req.body;
        // Find the user by email
        const checkEmail = await userModel.findOne({email: email.toLowerCase().trim()});
        // if no email found, return the error message
        if(!checkEmail){
            return res.status(400).json({
                message: 'Invalid email provided'})
        };
        // Define the email subject
        const subject = 'Reset password';
        // Generate reset token  that expires in 1 day
        const token = jwt.sign({id: checkEmail._id}, "flyover", {expiresIn: "1d"});
        // Save reset token to database for the user
        await userModel.findByIdAndUpdate(checkEmail._id, {token});
        // Create a password reset link with the user's id
        const link = `${req.protocol}://${req.get('host')}/api/v1/reset/${checkEmail._id}`;
        // Send reset email using helper function
        await sendMail({
            to: email,
            subject,
            // text,
            html: forgotHtml(link, checkEmail.fullName)
        });
        // Respond success message
        res.status(200).json({
            message: 'Kindly check your email for instructions'
        })

    } catch (error) {
        // Handles any unexpected server error
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })  
    }
};

exports.changePassword = async (req, res) => {
    try {
        // Extract the new and confirm password from the request body
        const {newPassword, confirmPassword} = req.body;
        // An if statement to check if both passwords match
        if(newPassword !== confirmPassword) {
            res.status(400).json("Password does not match")
        };
        // Generate salt for hashing password
        const saltRound = await bcrypt.genSalt(10);
        // Hash the new password 
        const hash = await bcrypt.hash(confirmPassword, saltRound);
        // Find user by Id from the request params
        const user = await userModel.findById(req.params.id);
        console.log(user);
        // Verify reset token that was stored in the DB
        jwt.verify(user.token, "flyover", async (err, result)=>{
            if(err){ // If the token expired
                console.log(err)
                return res.status(400).json({
                    message: "Email expired"
                })
            }else { // Update password in the DB and clear the token
                await userModel.findByIdAndUpdate(result.id, {password: hash, token: null}, {new: true});
                // Send a success response
                res.status(200).json({
                    message: "Password successfully changed"
                })
            }
        })
    } catch (error) {
        // Handles any unexpected server error
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })  
    }
};

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

exports.deleteUser = async (req, res) => {
    try {
        const {id} = req.params;
        const user = await userModel.findById(id);
        if(!user){
            return res.status(404).json({message: 'User not found'});
        }
        await userModel.findByIdAndDelete(id);
        res.status(200).json({
            message: 'User deleted successfully'
        })
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
}