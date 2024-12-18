// // utils/auth.js
// import nodemailer from 'nodemailer';

// // Generate a random 6-digit code
// const generateVerificationCode = () => {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Store codes temporarily (in production, use a database)
// const verificationCodes = new Map();

// // Create email template
// const createEmailTemplate = (code) => `
// <!DOCTYPE html>
// <html>
// <head>
//     <style>
//         body {
//             font-family: Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//         }
//         .logo {
//             text-align: center;
//             margin-bottom: 24px;
//         }
//         .code-container {
//             background-color: #f5f5f5;
//             padding: 20px;
//             border-radius: 8px;
//             text-align: center;
//             margin: 24px 0;
//         }
//         .code {
//             font-size: 32px;
//             font-weight: bold;
//             letter-spacing: 4px;
//             color: #000;
//         }
//         .footer {
//             text-align: center;
//             font-size: 12px;
//             color: #666;
//             margin-top: 24px;
//         }
//     </style>
// </head>
// <body>
//     <div class="logo">
//         <img src="https://dwellner.com/logo.png" alt="Dwellner" height="40">
//     </div>
    
//     <h2>Verify your email address</h2>
    
//     <p>Thanks for getting started with Dwellner! Please confirm your email address by entering this verification code:</p>
    
//     <div class="code-container">
//         <div class="code">${code}</div>
//     </div>
    
//     <p>This code will expire in 30 minutes. If you didn't request this code, you can safely ignore this email.</p>
    
//     <div class="footer">
//         <p>© 2024 Dwellner. All rights reserved.</p>
//         <p>123 Main St, Toronto, ON M5V 1A1</p>
//     </div>
// </body>
// </html>
// `;

// // Configure email transporter (replace with your email service credentials)
// const transporter = nodemailer.createTransport({
//     service: 'gmail',  // or your preferred email service
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD
//     }
// });

// export const sendVerificationEmail = async (email) => {
//     try {
//         const code = generateVerificationCode();
        
//         // Store the code (in production, use a database with expiration)
//         verificationCodes.set(email, {
//             code,
//             timestamp: Date.now()
//         });

//         // Send the email
//         await transporter.sendMail({
//             from: '"Dwellner" <noreply@dwellner.com>',
//             to: email,
//             subject: "Verify your email address",
//             html: createEmailTemplate(code)
//         });

//         return true;
//     } catch (error) {
//         console.error('Error sending verification email:', error);
//         return false;
//     }
// };

// // Verify the code
// export const verifyCode = (email, code) => {
//     const storedData = verificationCodes.get(email);
    
//     if (!storedData) {
//         return false;
//     }

//     // Check if code is expired (30 minutes)
//     if (Date.now() - storedData.timestamp > 30 * 60 * 1000) {
//         verificationCodes.delete(email);
//         return false;
//     }

//     if (storedData.code === code) {
//         verificationCodes.delete(email);
//         return true;
//     }

//     return false;
// };

// mock
const verificationCodes = new Map();

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email) => {
    try {
        const code = generateVerificationCode();
        
        // Store the code temporarily
        verificationCodes.set(email, {
            code,
            timestamp: Date.now()
        });

        // Development-friendly console output
        console.log('\n🔑 VERIFICATION CODE 🔑');
        console.log('━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${email}`);
        console.log(`🔢 Code: ${code}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━\n');

        return true;
    } catch (error) {
        console.error('Error generating verification code:', error);
        return false;
    }
};

export const verifyCode = (email, code) => {
    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
        console.log('❌ No verification code found for:', email);
        return false;
    }

    if (Date.now() - storedData.timestamp > 30 * 60 * 1000) {
        console.log('❌ Verification code expired');
        verificationCodes.delete(email);
        return false;
    }

    if (storedData.code === code) {
        console.log('✅ Code verified successfully!');
        verificationCodes.delete(email);
        return true;
    }

    console.log('❌ Invalid code entered');
    return false;
};