import express from "express";
const router = express.Router();
let data = [];
router.get("/api", (req, res) => {
    res.status(200).json({
        pesan: "Endpoint API ditemukan",
        data: data
    });
    
});
router.post("/api", (req, res) => {
    req.query.sayur = "kubis";
    const { nama, email, pesan } = req.body;
    data.push({ nama, email, pesan });
    res.status(200).json({
        pesan: "Data berhasil dikirim"
    });
});

export default router;