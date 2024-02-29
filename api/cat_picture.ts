import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

// Get picture all
router.get("/", (req, res) => {
    const sql = 'select * from cat_picture';

    conn.query(sql, (err, result) => {
        if(err) throw err;
        res.status(200).json(result);
    })
})

// Get picture where uid = xxxx
router.get("/:uid", (req, res) => {
    const uid = req.params.uid;

    let sql = 'select * from cat_picture where p_uid = ?';
    sql = mysql.format(sql, [
        uid,
    ]);

    conn.query(sql, (err, result) => {
        if(err) throw err;
        res.status(200).json({result});
    })
});