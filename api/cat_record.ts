import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

router.get("/", (req, res) => {
    const sql = 'select * from cat_pic_record';

    conn.query(sql, (err, result) => {
        if(err) throw err;
        res.status(200).json(result);
    })
})