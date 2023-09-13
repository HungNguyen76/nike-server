import nodemailer from 'nodemailer';
export default {
    sendMail: async (mailOptions) => {
        try {

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.MS_USER,
                    pass: process.env.MS_PW
                }
            });

            await transporter.sendMail({
                from: 'taido2452@gmail.com',
                ...mailOptions
            });

            return true
        } catch (err) {
            return false
        }
    }
}

