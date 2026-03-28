var express = require("express");
var router = express.Router();

let userModel = require("../schemas/users");
let userController = require("../controllers/users");

let { CreateAnUserValidator, validatedResult, ModifyAnUser } = require("../utils/validateHandler");
let { CheckLogin, CheckRole } = require("../utils/authHandler");
let { uploadExcel } = require("../utils/uploadHandler");

let path = require("path");

/**
 * GET ALL USERS
 */
router.get("/", CheckLogin, CheckRole("ADMIN"), async function (req, res, next) {
  try {
    let users = await userController.GetAllUser();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

/**
 * GET USER BY ID
 */
router.get("/:id", CheckLogin, CheckRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  try {
    let result = await userModel.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate("role");

    if (result) {
      res.send(result);
    } else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

/**
 * CREATE USER
 */
router.post("/", CreateAnUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newItem = await userController.CreateAnUser(
      req.body.username,
      req.body.password,
      req.body.email,
      req.body.role,
      null, // session
      req.body.fullName,
      req.body.avatarUrl,
      req.body.status,
      req.body.loginCount
    );

    let saved = await userModel.findById(newItem._id).populate("role");
    res.send(saved);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * IMPORT USERS FROM EXCEL
 * Chỉ ADMIN mới được import
 * Form-data:
 * key = file
 */
router.post(
  "/import",
  CheckLogin,
  CheckRole("ADMIN"),
  uploadExcel.single("file"),
  async function (req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).send({
          message: "file khong duoc de trong"
        });
      }

      let filePath = path.join(__dirname, "../uploads", req.file.filename);

      let result = await userController.ImportUsersFromExcel(filePath);

      res.send({
        message: "Import user thanh cong",
        data: result
      });
    } catch (error) {
      res.status(400).send({
        message: error.message
      });
    }
  }
);

/**
 * UPDATE USER
 */
router.put("/:id", ModifyAnUser, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }

    let populated = await userModel.findById(updatedItem._id).populate("role");
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

/**
 * DELETE USER (soft delete)
 */
router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }

    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;