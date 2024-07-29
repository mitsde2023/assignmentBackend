const axios = require("axios");
const express = require("express");
const cron = require("node-cron");
const { Op } = require("sequelize");
require("dotenv").config();
const router = express.Router();
const ProgramModel = require("../models/ProgramModel"); // Update the path based on your file structure
const BatchModel = require("../models/BatchModel"); // Update the path based on your file structure
const ApiKey = require("../models/ApiKey");
const Log = require("../models/Log");
const SubjectClassModel = require("../models/SubjectClassModel");

const apiUsername = process.env.API_USERNAME;
const apiPassword = process.env.API_PASSWORD;


router.get("/programs-with-batches", async (req, res) => {
  try {
    // Fetch all programs
    const programs = await ProgramModel.findAll();

    if (!programs || programs.length === 0) {
      return res.status(404).json({ message: "No programs found" });
    }

    // Fetch all batches
    const batches = await BatchModel.findAll();

    // Combine programs and batches
    const programsWithBatches = programs.map(program => {
      const programBatches = batches.filter(batch => batch.program_id === program.program_id);
      return {
        program_id: program.program_id,
        program_name: program.program_name,
        batches: programBatches.map(batch => ({
          batch_id: batch.batch_id,
          batch_name: batch.batch_name,
          start_date: batch.start_date,
          end_date: batch.end_date,
          admitted_students: batch.admitted_students,
          program_id: batch.program_id,
        }))
      };
    });

    res.status(200).json(programsWithBatches);
  } catch (error) {
    console.error("Error fetching programs with batches:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});



const getApiKey = async () => {
  try {
    // Find the first API key that has not expired yet
    const existingApiKey = await ApiKey.findOne({
      where: {
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (existingApiKey) {
      // If a valid API key is found, return it
      return existingApiKey.apiKey;
    } else {
      // If no valid API key is found, throw an error or return null/undefined
      throw new Error('No valid API key found');
    }
  } catch (error) {
    // If an error occurs during the process, throw the error
    console.error('Error retrieving API key:', error.message);
    throw error;
  }
};

// API endpoint to save all Programs & Batch data
router.post("/saveBundle", async (req, res) => {
  try {
    const apiKey = await getApiKey();

    const response = await axios.get(
      `https://mitsde.edmingle.com/nuSource/api/v1/short/masterbatch`,
      {
        headers: {
          ORGID: 3,
          apiKey: apiKey,
        },
      }
    );
    const courses = response.data.courses;

    for (const course of courses) {
      const { bundle_id, bundle_name } = course;

      try {
        const bundle = await ProgramModel.findOrCreate({
          where: { program_id: bundle_id },
          defaults: {
            program_id: bundle_id,
            program_name: bundle_name,
          },
        });
        for (const batch of course.batch) {
          await BatchModel.findOrCreate({
            where: { batch_id: batch.class_id },
            defaults: {
              batch_id: batch.class_id,
              batch_name: batch.class_name,
              start_date: batch.start_date,
              end_date: batch.end_date,
              admitted_students: batch.admitted_students,
              program_id: bundle[0].dataValues.program_id,
            },
          });
        }

        console.log(`Data saved successfully for bundle_id: ${bundle_id}`);
      } catch (error) {
        console.error(
          `Error processing bundle_id ${bundle_id}:`,
          error.message
        );
        continue;
      }
    }

    res.status(201).json({ message: "Data saved successfully." });
  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


async function saveBundle() {
  try {
    const apiKey = await getApiKey();

    const response = await axios.get(
      `https://mitsde.edmingle.com/nuSource/api/v1/short/masterbatch`,
      {
        headers: {
          ORGID: 3,
          apiKey: apiKey,
        },
      }
    );
    const courses = response.data.courses;

    for (const course of courses) {
      const { bundle_id, bundle_name } = course;

      try {
        const bundle = await ProgramModel.findOrCreate({
          where: { program_id: bundle_id },
          defaults: {
            program_id: bundle_id,
            program_name: bundle_name,
          },
        });
        for (const batch of course.batch) {
          await BatchModel.findOrCreate({
            where: { batch_id: batch.class_id },
            defaults: {
              batch_id: batch.class_id,
              batch_name: batch.class_name,
              start_date: batch.start_date,
              end_date: batch.end_date,
              admitted_students: batch.admitted_students,
              program_id: bundle[0].dataValues.program_id,
            },
          });
        }

        console.log(`Data saved successfully for bundle_id: ${bundle_id}`);
      } catch (error) {
        console.error(
          `Error processing bundle_id ${bundle_id}:`,
          error.message
        );
        continue;
      }
    }

    console.log("Data saved successfully.");
  } catch (error) {
    console.error("API Error:", error.message);
    await Log.create({
      message: `saveBundle error: ${timeanddate}`,
      level: "error in saveBundle-function every 60 hr",
    });
  }
}

async function savlogs() {
  console.log('Running scheduled task: saveBundle');
  const timeanddate = new Date().toISOString(); // Get current date and time in ISO format

  try {
    await Log.create({
      message: `saveBundle fetched successfully: ${timeanddate}`,
      level: "saveBundle-function every 60 hr",
    });
    console.log('Log entry created successfully.');
  } catch (error) {
    console.error('Error creating log entry:', error.message);
  }
}
// Schedule the task to run every 60 hours
cron.schedule('0 0 */60 * * *', () => {
  savlogs()
  saveBundle();
});
const fetchNewApiKey = async () => {
  try {

    const formData = new FormData();
    formData.append('JSONString', JSON.stringify({
      username: apiUsername,
      password: apiPassword,
      persistent_login: true,
    }));

    const response = await axios.post(
      "https://mitsde.edmingle.com/nuSource/api/v1/tutor/login",
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log(response, 84);
    return response.data.user.apikey;
  } catch (error) {
    console.error("Error fetching new API key:", error.message);
    throw error;
  }
};


const updateApiKey = async () => {
  try {
    const existingApiKey = await ApiKey.findOne({
      where: {
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (existingApiKey) {
      // If an existing key is found, no need to fetch a new key
      console.log("Existing API key is still valid.");
    } else {
      // If no existing key is found or the existing key is expired, fetch a new key and create a record
      const newApiKey = await fetchNewApiKey();

      await ApiKey.create({
        apiKey: newApiKey,
        expiresAt: new Date(new Date().getTime() + 28 * 24 * 60 * 60 * 1000), // 15 days from now
      });
      await Log.create({
        message: `New API key created successfully : ${newApiKey}`,
        level: "apiKey-crated",
      });
      console.log("New API key created successfully.");
    }
  } catch (error) {
    await Log.create({
      message: `Error processing apiKey: ${error.message}`,
      level: "apiKey-update",
    });
    // console.error("Error updating API key:", error.message);
  }
};

// updateApiKey();

cron.schedule("0 0 */28 * * *", async () => {
  console.log("Running the API key update job...");
  await updateApiKey();
});


const initializeApiKey = async () => {
  try {
    // Check if there's an existing API key
    const existingApiKey = await ApiKey.findOne();

    if (!existingApiKey) {
      // If no existing key is found, fetch a new key and create a record
      const newApiKey = await fetchNewApiKey();

      await ApiKey.create({
        apiKey: newApiKey,
        expiresAt: new Date(new Date().getTime() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
      });

      await Log.create({
        message: `Initial API key created successfully: ${newApiKey}`,
        level: "apiKey-initialized",
      });
      console.log("Initial API key created successfully.");
    }
  } catch (error) {
    await Log.create({
      message: `Error initializing API key: ${error.message}`,
      level: "apiKey-initialization-error",
    });
    console.error("Error initializing API key:", error.message);
  }
};

// Call the initializeApiKey function during application startup
initializeApiKey();

router.get('/getApiKey', async (req, res) => {
  try {
    // Find the first API key that has not expired yet
    const existingApiKey = await ApiKey.findOne({
      where: {
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (existingApiKey) {
      res.status(200).json({ apiKey: existingApiKey.apiKey });
    } else {
      res.status(404).json({ error: 'No valid API key found' });
    }
  } catch (error) {
    console.error('Error retrieving API key:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// API endpoint to get a new API key
router.get('/getNewApiKey', async (req, res) => {
  try {
    // Check if there's an existing API key
    const existingApiKey = await ApiKey.findOne();

    if (existingApiKey) {
      const now = new Date();
      if (existingApiKey.expiresAt > now) {
        // If existing key is not expired, return it with the expiry date
        return res.json({ apiKey: existingApiKey.apiKey, expiresAt: existingApiKey.expiresAt });
      }
    }

    // If no existing key is found or it is expired, fetch a new key and create a record
    const newApiKey = await fetchNewApiKeyPost();

    const expiresAt = new Date(new Date().getTime() + 28 * 24 * 60 * 60 * 1000); // 28 days from now

    if (existingApiKey) {
      // Update the existing record
      existingApiKey.apiKey = newApiKey;
      existingApiKey.expiresAt = expiresAt;
      await existingApiKey.save();
    } else {
      // Create a new record
      await ApiKey.create({
        apiKey: newApiKey,
        expiresAt: expiresAt,
      });
    }

    await Log.create({
      message: `API key fetched successfully: ${newApiKey}`,
      level: "apiKey-initialized",
    });

    console.log("API key fetched successfully.");
    res.json({ apiKey: newApiKey, expiresAt: expiresAt });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to fetch new API key
const fetchNewApiKeyPost = async () => {
  try {
    const formData = new FormData();
    formData.append('JSONString', JSON.stringify({
      username: apiUsername,
      password: apiPassword,
      persistent_login: true,
    }));

    const response = await axios.post(
      "https://mitsde.edmingle.com/nuSource/api/v1/tutor/login",
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log(response, 84);
    return response.data.user.apikey;
  } catch (error) {
    console.error("Error fetching new API key:", error.message);
    throw error;
  }
};

module.exports = router;
