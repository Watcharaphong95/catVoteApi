import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

// Get all record
router.get("/", (req, res) => {
    const sql = 'select * from cat_pic_record';

    conn.query(sql, (err, result) => {
        if(err) throw err;
        res.status(200).json(result);
    })
})

// Get record where pid and order by date all time
router.get("/:pid", (req, res) => {
    const pid = req.params.pid;
    let sql = 'SELECT r_pid, MAX(date) AS max_date FROM cat_pic_record WHERE r_pid = ? GROUP BY r_pid, DATE(date);';
    sql = mysql.format(sql, [
        pid,
        pid,
    ]);

    conn.query(sql, (err, result) => {
        if(err) throw err;
        res.status(200).json(result);
    });
});