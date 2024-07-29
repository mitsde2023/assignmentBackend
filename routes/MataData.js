const express = require("express");
const router = express.Router();
const { Op } = require('sequelize');
const FlattenedDataModel = require("../models/FlattenedDataModel");
const All_Students = require("../models/All_Students");
const ProgramModel = require("../models/ProgramModel");
const BatchModel = require("../models/BatchModel");


// Endpoint to get student count and last student's updatedAt timestamp
router.get('/students', async (req, res) => {
    try {
        const studentCount = await All_Students.count();
        const lastStudent = await All_Students.findOne({ order: [['updatedAt', 'DESC']] });
        res.json({
            studentCount,
            lastStudentUpdatedAt: lastStudent.updatedAt
        });
    } catch (error) {
        console.error("Error retrieving student data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get ProgramModel count
router.get('/programs', async (req, res) => {
    try {
        const programCount = await ProgramModel.count();
        res.json({
            programCount,
        });
    } catch (error) {
        console.error("Error retrieving program data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get all programs
router.get('/all-programs', async (req, res) => {
    try {
      const programs = await ProgramModel.findAll();
      const lastProgram = await ProgramModel.findOne({ order: [['updatedAt', 'DESC']] });

      res.json({programs, lastProgramUpdatedAt: lastProgram.updatedAt});
    } catch (error) {
      console.error("Error retrieving programs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Endpoint to get count of all batches
router.get('/batches/count', async (req, res) => {
    try {
        const batchCount = await BatchModel.count();
        res.json({ batchCount });
    } catch (error) {
        console.error("Error retrieving batch count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get batch-wise admitted students
router.get('/batches/:batchId/admitted_students', async (req, res) => {
    const { batchId } = req.params;
    try {
        const batch = await BatchModel.findByPk(batchId);
        if (!batch) {
            return res.status(404).json({ error: "Batch not found" });
        }

        const admittedStudents = batch.admitted_students;
        res.json({ admittedStudents });
    } catch (error) {
        console.error("Error retrieving admitted students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Endpoint to get all batches with admitted students count
router.get('/batches', async (req, res) => {
    try {
        const batches = await BatchModel.findAll({
            attributes: ['id', 'batch_name', 'admitted_students'],
        });
        const lastBatch = await BatchModel.findOne({ order: [['updatedAt', 'DESC']] });
        res.json({batches, lastBatchUpdatedAt: lastBatch.updatedAt });
    } catch (error) {
        console.error("Error retrieving batches:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Endpoint to get count of all Assignament records

router.get('/flattenedData/count', async (req, res) => {
    try {
        const flattenedDataCount = await FlattenedDataModel.count();
        res.json({ flattenedDataCount });
    } catch (error) {
        console.error("Error retrieving flattened data count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get count of unique user_id values
router.get('/flattenedData/unique_users_count', async (req, res) => {
    try {
        const uniqueUsersCount = await FlattenedDataModel.aggregate('user_id', 'DISTINCT', { plain: false });
        res.json({ uniqueUsersCount: uniqueUsersCount.length });
    } catch (error) {
        console.error("Error retrieving unique users count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get the updatedAt timestamp of the last Assignament record
router.get('/flattenedData/last_updated_at', async (req, res) => {
    try {
        const lastUpdatedAtRecord = await FlattenedDataModel.findOne({
            order: [['updatedAt', 'DESC']]
        });
        res.json({ lastUpdatedAt: lastUpdatedAtRecord.updatedAt });
    } catch (error) {
        console.error("Error retrieving last updated at timestamp:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;