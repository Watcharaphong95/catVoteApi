import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

router.get("/", (req, res) => {
  const sql = "select * from cat_user";

    conn.query(sql, (err, result) => {
        if(err){
            res.status(400).json(err);
        }else{
            res.json(result)
        }
    })
});