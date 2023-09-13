import userModel from "../models/user.model";
import mailService from '../services/mail';
import ejs from 'ejs'
import path from 'path'
import jwt from '../services/jwt';
import bcrypt from 'bcrypt';
import ipService from '../services/ip';

async function sendMailLogin(user, ip) {
    let result = await ipService.deIp(ip); // 5.181.233.162
    /* Xử lý email */
    try {
        let mailSent = await mailService.sendMail({
            to: user.email,
            subject: "Thông báo về tài khoản",
            html: `
                <h1 style="color: red">
                    ${result.status == "fail"
                ?
                "Tài khoản đã login tại địa chỉ ip là: " + ip
                : "Tài khoản đã login tại: quốc gia: " + result.country + " với ip là: " + result.query
            }

                </h1>
            `
        });
    } catch (err) {
        //console.log("err", err)
    }
}

export default {
    create: async (req, res) => {
        try {
            req.body.password = await bcrypt.hash(req.body.password, 10);
            let modelRes = await userModel.create(req.body)

            /* Xử lý email */
            try {
                if (modelRes.status) {
                    let token = jwt.createToken({
                        user_name: req.body.user_name,
                        email: req.body.email
                    }, 300000)

                    if (!token) {
                        return res.status(200).json({
                            message: "Đăng ký thành công, nhưng gửi mail thất bại!"
                        })
                    }
                    let template = await ejs.renderFile(
                        path.join(__dirname, "../templates/email_confirm.ejs"),
                        { user: req.body, token }
                    )

                    if (modelRes.status) {
                        let mailOptions = {
                            to: req.body.email,
                            subject: "Xác thực email!",
                            html: template
                        }
                        let mailSent = await mailService.sendMail(mailOptions);
                        if (mailSent) {
                            modelRes.message += " Đã gửi email xác thực, vui lòng kiểm tra!"
                        }
                    }
                }
            } catch (err) {
                modelRes.message += " Lỗi trong quá trình gửi mail xác thực, bạn có thể gửi lại email trong phần profile"
            }

            res.status(modelRes.status ? 200 : 413).json(modelRes)
        } catch (err) {
            return res.status(500).json(
                {
                    message: "Lỗi xử lý!"
                }
            )
        }
    },
    confirm: async (req, res) => {
        let decode = jwt.verifyToken(req.params.token)

        if (!decode) {
            return res.send("Email đã hết hiệu lực!")
        }
        try {
            let modelRes = await userModel.confirm(decode)

            res.status(modelRes.status ? 200 : 413).send("Confirm Email Success!")

        } catch (err) {
            return res.status(500).json(
                {
                    message: "Bad request !"
                }
            )
        }
    },
    login: async (req, res) => {
        try {
            let modelRes = await userModel.login(req.body)

            if (modelRes.status) {
                // xác thực passord
                let checkPassword = await bcrypt.compare(req.body.password, modelRes.data.password)
                if (!checkPassword) {
                    modelRes.message = "Mật khẩu không chính xác!"
                    return res.status(modelRes.status ? 200 : 413).json(modelRes)
                }
                // xác thực trạng thái tài khoản
                if (modelRes.data.blocked) {
                    modelRes.message = "Tài khoản đã bị khóa!"
                    return res.status(modelRes.status ? 200 : 413).json(modelRes)
                }
                // thành công xử lý token
                let token = jwt.createToken(modelRes, "1d");

                // gửi mail thông báo về tình hình đăng nhập nếu đã xác nhận email.
                let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // địa chỉ ip nơi gửi request
                sendMailLogin(modelRes.data, ipAddress);

                // trả về client
                return res.status(token ? 200 : 314).json(
                    {
                        message: token ? "Login thành công!" : "Server bảo trì!",
                        token,
                        userId: modelRes.data.id
                    }
                )
            }
            return res.status(modelRes.status ? 200 : 413).json(modelRes)
        } catch (err) {
            return res.status(500).json(
                {
                    message: "Lỗi xử lý!"
                }
            )
        }
    },
    authenToken: async (req, res) => {
        let decode = jwt.verifyToken(req.body.token);
        if (decode) {
            let modelRes = await userModel.findById(decode.data.id);

            return res.status(new Date(decode.data.update_at).toDateString() == modelRes.update_at.toDateString() ? 200 : 500).json(decode)
        }
        return res.status(500).json(decode);
    },
    changePassword: async (req, res) => {
        try {
            let checkPass = await bcrypt.compare(req.body.old_pass, req.body.data.password);

            if (!checkPass) {
                return res.status(200).json({
                    message: "Mật khẩu không chính xác!"
                })
            }

            let token = jwt.createToken(
                {
                    new_pass: await bcrypt.hash(req.body.new_pass, 10),
                    user_name: req.body.data.user_name
                }, 300000
            )

            let mailOptions = {
                to: req.body.data.email,
                subject: "Xác thực thay đổi mật khẩu!",
                html: `
                    <h1>Thời gian đổi: ${(new Date(Date.now())).getDay()}</h1>
                    <a href="${process.env.SV_HOST}:${process.env.SV_PORT}/apis/v1/users/change-password-confirm/${token}">Xác nhận đổi</a>
                `
            }

            let mailSent = await mailService.sendMail(mailOptions);
            return res.status(200).json(
                {
                    message: mailSent ? "Đã gửi lại email xác nhận!" : "Lỗi hệ thống"
                }
            )
        } catch (err) {
            return res.status(200).json(
                {
                    message: "Lỗi hệ thống"
                }
            )
        }
    },
    changePasswordConfirm: async (req, res) => {
        try {
            let token = req.params.token;
            let decode = jwt.verifyToken(token);
            if (!decode) {
                return res.status(200).send("Email hết hạn!")
            } else {
                console.log("decode", decode)
                let result = await userModel.update({
                    user_name: decode.user_name,
                    password: decode.new_pass
                })
                if (result.status) {
                    return res.json({
                        message: "Đổi pass thành công!"
                    })
                }
            }
        } catch (err) {

        }
    },
    resend: async (req, res) => {
        try {
            /* Xử lý email */
            let token = jwt.createToken({
                user_name: req.body.user_name,
                email: req.body.email
            }, 300000)

            let template = await ejs.renderFile(
                path.join(__dirname, "../templates/email_confirm.ejs"),
                { user: req.body, token }
            )

            let mailOptions = {
                to: req.body.email,
                subject: "Xác thực email!",
                html: template
            }

            let mailSent = await mailService.sendMail(mailOptions);
            return res.status(200).json(
                {
                    message: mailSent ? "Đã gửi lại email xác nhận!" : "Lỗi hệ thống"
                }
            )
        } catch (err) {
            return res.status(200).json(
                {
                    message: "Lỗi hệ thống"
                }
            )
        }

    },
    findAllUsers: async (req, res) => {
        try {
            let modelRes = await userModel.findAllUsers();

            return res.status(modelRes.status ? 200 : 214).json(modelRes)

        } catch (err) {
            return res.status(500).json(
                {
                    message: "Bad request products !"
                }
            )
        }
    },
}

