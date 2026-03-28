let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let exceljs = require("exceljs");
let { sendUserAccountEmail } = require("../utils/mailHandler");

/**
 * Hàm tạo mật khẩu ngẫu nhiên 16 ký tự
 */
function generateRandomPassword(length = 16) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";

    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
}

/**
 * Hàm lấy dữ liệu từ ô Excel
 * Fix lỗi [object Object]
 */
function getCellValue(cell) {
    if (!cell) return "";

    // Nếu là string/number bình thường
    if (typeof cell === "string" || typeof cell === "number") {
        return cell.toString().trim();
    }

    // Nếu ExcelJS trả về object
    if (typeof cell === "object") {
        if (cell.text) return cell.text.toString().trim();
        if (cell.result) return cell.result.toString().trim();
        if (cell.richText) {
            return cell.richText.map(item => item.text).join("").trim();
        }
        if (cell.hyperlink) return cell.hyperlink.toString().trim();
    }

    return "";
}

module.exports = {
    /**
     * Tạo 1 user mới
     */
    CreateAnUser: async function (
        username,
        password,
        email,
        role,
        session = null,
        fullName = "",
        avatarUrl = "https://i.sstatic.net/l60Hf.png",
        status = false,
        loginCount = 0
    ) {
        let newItem = new userModel({
            username: username,
            password: password,
            email: email,
            fullName: fullName,
            avatarUrl: avatarUrl,
            status: status,
            role: role,
            loginCount: loginCount
        });

        await newItem.save({ session });
        return newItem;
    },

    /**
     * Lấy toàn bộ user chưa bị xóa
     */
    GetAllUser: async function () {
        let users = await userModel
            .find({ isDeleted: false })
            .populate("role");

        return users;
    },

    /**
     * Tìm user theo username
     */
    GetAnUserByUsername: async function (username) {
        let user = await userModel
            .findOne({
                isDeleted: false,
                username: username
            })
            .populate("role");

        return user;
    },

    /**
     * Tìm user theo email
     */
    GetAnUserByEmail: async function (email) {
        let user = await userModel
            .findOne({
                isDeleted: false,
                email: email
            })
            .populate("role");

        return user;
    },

    /**
     * Tìm user theo token quên mật khẩu
     */
    GetAnUserByToken: async function (token) {
        let user = await userModel.findOne({
            isDeleted: false,
            forgotPasswordToken: token
        });

        if (!user) return false;

        if (user.forgotPasswordTokenExp > Date.now()) {
            return user;
        } else {
            return false;
        }
    },

    /**
     * Tìm user theo ID
     */
    GetAnUserById: async function (id) {
        let user = await userModel
            .findOne({
                isDeleted: false,
                _id: id
            })
            .populate("role");

        return user;
    },

    /**
     * Import user từ file Excel
     * Cột A = username
     * Cột B = email
     */
    ImportUsersFromExcel: async function (filePath) {
        let workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        let worksheet = workbook.worksheets[0];

        let result = [];

        // Tìm role USER trong DB
        let userRole = await roleModel.findOne({
            name: "USER",
            isDeleted: false
        });

        if (!userRole) {
            throw new Error("Khong tim thay role USER trong database");
        }

        // Lấy user hiện tại để chống trùng
        let existingUsers = await userModel.find({ isDeleted: false });
        let existingUsernames = existingUsers.map(u => u.username.toLowerCase());
        let existingEmails = existingUsers.map(u => u.email.toLowerCase());

        // Duyệt từ dòng 2 vì dòng 1 là header
        for (let row = 2; row <= worksheet.rowCount; row++) {
            const contentRow = worksheet.getRow(row);

            let username = getCellValue(contentRow.getCell(1).value);
            let email = getCellValue(contentRow.getCell(2).value).toLowerCase();

            let errors = [];

            // Bỏ qua dòng trống
            if (!username && !email) {
                continue;
            }

            // Validate
            if (!username) {
                errors.push("username khong duoc de trong");
            }

            if (!email) {
                errors.push("email khong duoc de trong");
            }

            let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email)) {
                errors.push("email khong hop le");
            }

            if (username && existingUsernames.includes(username.toLowerCase())) {
                errors.push("username da ton tai");
            }

            if (email && existingEmails.includes(email.toLowerCase())) {
                errors.push("email da ton tai");
            }

            // Nếu lỗi thì lưu lỗi
            if (errors.length > 0) {
                result.push({
                    row: row,
                    username: username,
                    email: email,
                    success: false,
                    errors: errors
                });
                continue;
            }

            // Tạo password random
            let randomPassword = generateRandomPassword(16);

            // Tạo user
            let newUser = new userModel({
                username: username,
                email: email,
                password: randomPassword,
                role: userRole._id,
                fullName: "",
                status: true
            });

            await newUser.save();

            // Cập nhật mảng chống trùng
            existingUsernames.push(username.toLowerCase());
            existingEmails.push(email.toLowerCase());

            // Gửi mail
            try {
                await sendUserAccountEmail(email, username, randomPassword);
                console.log(`Gui mail thanh cong cho: ${email}`);
            } catch (mailError) {
                console.log(`Loi gui mail cho ${email}:`, mailError.message);
            }

            // Kết quả thành công
            result.push({
                row: row,
                username: username,
                email: email,
                password: randomPassword,
                success: true
            });
        }

        return result;
    }
};