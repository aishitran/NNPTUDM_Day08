const nodemailer = require("nodemailer");

/**
 * Cấu hình Mailtrap SMTP
 * Bạn thay host, port, user, pass theo tài khoản Mailtrap của bạn
 */
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "34814e7545ae4a",
        pass: "697dd400d02ae1"
    }
});

module.exports = {
    /**
     * Gửi mail tài khoản cho user sau khi import
     */
    sendUserAccountEmail: async function (toEmail, username, password) {
        let mailOptions = {
            from: "no-reply@nnptud.com",
            to: toEmail,
            subject: "Tai khoan cua ban da duoc tao",
            html: `
                <h2>Xin chao ${username},</h2>
                <p>Tai khoan cua ban da duoc tao thanh cong.</p>
                <p><b>Username:</b> ${username}</p>
                <p><b>Email:</b> ${toEmail}</p>
                <p><b>Password:</b> ${password}</p>
                <p>Vui long dang nhap va doi mat khau sau khi su dung.</p>
                <br/>
                <p>Tran trong.</p>
            `
        };

        return await transporter.sendMail(mailOptions);
    }
};