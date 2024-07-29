const express = require('express');
const app = express();
const xlsx = require('xlsx');
const multer = require('multer');
const cors = require('cors');
const Course_Subject_routes = require('./routes/Course_Subject');
// const Class_Routes=require('./routes/Class')
const Student_Routes = require('./routes/Student')
const Marks_Routes = require("./routes/Marks")
const sequelize = require('./config');
const FlippedStudent = require('./models/FlippedStudent');
const StudentSubCode = require('./models/SubjectCode');
const FlattenedDataModel = require('./models/FlattenedDataModel');
const All_Students = require('./models/All_Students');
const StudentSubWiseMarks = require('./models/StudentSubWiseMarks.js');
const gradbook = require('./models/gradbook.js');
const MetaData = require('./routes/MataData.js');
const { default: axios } = require('axios');
const { Parser } = require('json2csv');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// const FlattenedDataModel = require('./models/FlattenedDataModel');
app.use(cors());
app.use(express.json());

// app.use(cors({ origin: 'http://localhost:3000' }));


sequelize.sync().then(() => {
  console.log('Database synced.');
});

app.use('/api/course', Course_Subject_routes);
// app.use('/api/batch', Batch_Routes);
// app.use('/api/class', Class_Routes)
app.use('/api/student', Student_Routes)
app.use('/api/marks', Marks_Routes)
app.use('/api/meatdata', MetaData)


app.post('/save_flipped_students', upload.single('excelFile'), async (req, res) => {
  try {
    // Check if an Excel file is provided
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file not provided.' });
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const excelData = workbook.Sheets[sheetName];

    const result = await saveFlippedStudentsData(excelData);

    res.json({ success: true, message: 'Flipped students data saved successfully.', result });
  } catch (error) {
    console.error('Error processing flipped students data:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});


app.post('/saveSubjectCode', upload.single('excelFile'), async (req, res) => {
  try {
    // Check if an Excel file is provided
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file not provided.' });
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const excelData = workbook.Sheets[sheetName];

    const result = await saveSubjectCode(excelData);

    res.json({ success: true, message: 'Flipped students data saved successfully.', result });
  } catch (error) {
    console.error('Error processing flipped students data:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});

const saveSubjectCode = async (excelData) => {
  try {
    // Convert Excel data to JSON
    const jsonData = xlsx.utils.sheet_to_json(excelData);
    console.log('JSON Data:', jsonData);

    // Save each student to the database
    for (const SubjectData of jsonData) {
      try {
        await StudentSubCode.create(SubjectData);
      } catch (error) {
        console.error('Error creating student:', error);
      }
    }
    return { success: true, message: 'Flipped students data saved successfully.' };
  } catch (error) {
    console.error('Error saving flipped students data:', error.message);
    throw error;
  }
};

const saveFlippedStudentsData = async (excelData) => {
  try {
    // Convert Excel data to JSON
    const jsonData = xlsx.utils.sheet_to_json(excelData);
    console.log('JSON Data:', jsonData);

    // Save each student to the database
    for (const studentData of jsonData) {
      try {
        await FlippedStudent.create(studentData);
      } catch (error) {
        console.error('Error creating student:', error);
      }
    }
    return { success: true, message: 'Flipped students data saved successfully.' };
  } catch (error) {
    console.error('Error saving flipped students data:', error.message);
    throw error;
  }
};

app.get('/flipped_students', async (req, res) => {
  try {
    const flippedStudents = await FlippedStudent.findAll();
    res.json({ success: true, flippedStudents });
  } catch (error) {
    console.error('Error fetching flipped students:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/subject_codes', async (req, res) => {
  try {
    const subjectCodes = await StudentSubCode.findAll();
    res.json({ success: true, subjectCodes });
  } catch (error) {
    console.error('Error fetching subject codes:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



const StudentSubjectWiseData = async () => {
  try {
    // Fetch marks data
    const marksData = await FlattenedDataModel.findAll();
    console.log(marksData, 148);

    // Fetch students data
    const studentsData = await All_Students.findAll();
    console.log(studentsData, 152);

    const subjectCodes = await StudentSubCode.findAll();
    console.log(subjectCodes, 155);

    // const flippedStudent = await FlippedStudent.findAll();
    // console.log(flippedStudent, 158);

    // Normalize function to convert to lowercase and remove spaces
    // const normalizeString = (str) => str.toLowerCase().replace(/\s/g, '');

    // Map over marksData and combine with studentsData
    const combinedData = marksData.map((marksItem) => {
      const matchingStudent = studentsData.find(
        (student) => student.user_id === marksItem.user_id
      );

      return {
        ...marksItem.dataValues,
        registration_number: matchingStudent
          ? matchingStudent.registration_number
          : "SWM Reg_No NF",
        email: matchingStudent ? matchingStudent.email : "SWM Email NF",
        name: matchingStudent ? matchingStudent.name : "SWM name NF",
      };
    });

    console.log(combinedData, 165);

    const finalData = combinedData.map((item) => {
      const normalizedItemName = item.subject_name;
      const matchingSubjectName = subjectCodes.find(
        (sub) => sub.Subject === normalizedItemName
      );

      return {
        ...item,
        subject_code: matchingSubjectName ? matchingSubjectName.Code : "Subject Name Not Match",
      };
    });

    await StudentSubWiseMarks.bulkCreate(finalData);
    console.log('Data saved successfully.');
  } catch (error) {
    console.error('Error fetching or saving data:', error);
  }
};


// StudentSubjectWiseData();


app.get('/api/studentSubWiseMarks', async (req, res) => {
  try {
    const marksData = await StudentSubWiseMarks.findAll();
    res.json(marksData);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getStudentDatawithsubjectCode', async (req, res) => {
  try {
    // Fetch data from the database with specific fields
    const studentData = await StudentSubWiseMarks.findAll({
      attributes: ['subject_name', 'subject_code', 'registration_number', 'email', 'name', 'assignments', 'updatedAt'],
    });

    res.json({
      success: true,
      data: studentData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
});


app.get('/api/studentSubWiseMarks/calloperation', async (req, res) => {
  try {
    await StudentSubjectWiseData();
    await UpdateStudentSubjectWiseData();

    res.json("operation done...");

  } catch (error) {
    console.error('Error fetching or saving data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const UpdateStudentSubjectWiseData = async () => {
  try {
    // Fetch all records from FlippedStudent
    const flippedStudents = await FlippedStudent.findAll();
    console.log(flippedStudents, 158);

    // Fetch all records from StudentSubWiseMarks
    const studentFinalData = await StudentSubWiseMarks.findAll();
    console.log(studentFinalData);

    // Update subject_code for each registrationNo in StudentSubWiseMarks
    for (const flippedStudent of flippedStudents) {
      const { registrationNo } = flippedStudent;

      // Find all records with matching registration_number
      const matchingRecords = studentFinalData.filter(
        (record) => record.registration_number === registrationNo
      );

      // Update subject_code for each matching record
      for (const record of matchingRecords) {
        const existingSubjectCode = record.subject_code;
        const modifiedSubjectCode = `F${existingSubjectCode}`;

        // Update the subject_code in the database
        await StudentSubWiseMarks.update(
          { subject_code: modifiedSubjectCode },
          { where: { id: record.id } }
        );
      }
    }
    console.log('Data updated successfully.');
    return 'Data updated successfully.';
  } catch (error) {
    console.error('Error updating data:', error);
  }
};



const subjectsArray = [
  { subject_code: 'FS0W01', Subject: 'Digital Marketing' },
  { subject_code: 'FS0W01', Subject: 'Digital Marketing FS0W01' },
  { subject_code: 'FS0W01', Subject: 'Digital - Marketing-FS0W01' },
  { subject_code: 'FS1F01', Subject: 'Foundations of Business Management' },
  { subject_code: 'FS1F01', Subject: 'Foundations of Business Management (HR, Marketing, Finance & Operations)' },
  { subject_code: 'FS1F01', Subject: 'FoundationsofBusinessManagement(HR,Marketing,Finance&Operations)' },
  { subject_code: 'FS1LA1', Subject: 'Legal Aspects of Business' },
  { subject_code: 'FS2C07', Subject: 'Management Information System' },
  { subject_code: 'FS2C10', Subject: 'Strategic Management' },
  { subject_code: 'FS2SF2', Subject: 'Social Media analytics & future trends' },
  { subject_code: 'FS2SF2', Subject: 'Social Media Analytics & Future Trends' },
  { subject_code: 'FS2SF2', Subject: 'SocialMediaAnalytics&FutureTrends' },
  { subject_code: 'FS2SS2', Subject: 'SEO & SEM' },
  { subject_code: 'FS3El5', Subject: 'Social Media Marketing' },
  { subject_code: 'FS3W05', Subject: 'Integrated Marketing Communication' },
  { subject_code: 'FS3W06', Subject: 'Product & Brand Management' },
  { subject_code: 'FS3W06', Subject: 'Product and Brand Management' },
  { subject_code: 'FS2C11', Subject: 'Business Analytics' },
  { subject_code: 'FS2DB1', Subject: 'Data Mining for Business Analytics' },
  { subject_code: 'FS3EL4', Subject: 'Marketing Analytics' },
  { subject_code: 'FS3EL6', Subject: 'Predictive Modeling' },
  { subject_code: 'FS3FM4', Subject: 'Financial Analytics' },
  { subject_code: 'FS3LSC1', Subject: 'Supply chain Analytics' },
  { subject_code: 'FS2SS2', Subject: 'SEO - & - SEM' },
  { subject_code: 'FS2SF2', Subject: 'Social - Media - Analytics - & - Future - Trends' },
  { subject_code: 'FS0W01', Subject: 'Digital Marketing_E' },
  { subject_code: 'FS3W05', Subject: 'Integrated Marketing Communication_E' },
  { subject_code: 'FS3W06', Subject: 'Product and Brand Management_E' },
];

subjectsArray.forEach(entry => {
  entry.Subject = entry.Subject.replace(/\s/g, ''); // Remove spaces
});

app.get('/updatecode', async (req, res) => {
  try {
    const flipStuList = await FlippedStudent.findAll();
    const registrationNumbers = flipStuList.map(student => student.registrationNo);
    console.log(registrationNumbers, 268);

    // Array to store updated data
    const updatedDataArray = [];
    const unmatchedDataArray = [];
    const uniqueUnmatchedSubjects = new Set();

    // Loop through each registration number
    for (const regNo of registrationNumbers) {
      // Find all records in StudentSubWiseMarks based on registration number
      const stuFinalDataArray = await StudentSubWiseMarks.findAll({
        where: {
          registration_number: regNo // Update with your actual field name
        }
      });

      // Update subject_code in each found record
      for (const stuFinalData of stuFinalDataArray) {
        // Extract subject name from the subject_name field
        const subjectName = stuFinalData.subject_name;

        // Replace spaces and dashes with an empty string to match the format in the subjectsArray
        const subjectnamewithoutdash = subjectName.replace(/[\s-]/g, '');

        console.log(subjectnamewithoutdash, 310);

        // Find the corresponding entry in subjectsArray
        const subjectEntry = subjectsArray.find(entry => entry.Subject === subjectnamewithoutdash);
        console.log(subjectEntry, 313);

        // Update subject_code in the found record
        if (subjectEntry) {
          stuFinalData.subject_code = subjectEntry.subject_code;
          await stuFinalData.save();
          updatedDataArray.push(stuFinalData);
        } else {
          // If subjectEntry is not found, add the subject name to uniqueUnmatchedSubjects set
          uniqueUnmatchedSubjects.add(subjectName);
          unmatchedDataArray.push(subjectEntry)
        }
      }
    }

    // Convert uniqueUnmatchedSubjects set to an array
    const uniqueUnmatchedSubjectsArray = Array.from(uniqueUnmatchedSubjects);

    console.log(updatedDataArray.length, 293);
    console.log(unmatchedDataArray.length, 294);
    console.log(uniqueUnmatchedSubjectsArray.length, 295);
    res.json({
      message: 'Data updated successfully',
      updatedData: updatedDataArray,
      unmatchedData: unmatchedDataArray,
      uniqueSubjects: uniqueUnmatchedSubjectsArray
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/api/grade_marks', async (req, res) => {
  try {
    const data = await gradbook.findAll();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// dashbord Apis

app.get('/downloadExcel', async (req, res) => {
  try {
    const marksResponse = await axios.get("http://localhost:7000/getStudentDatawithsubjectCode");
    const marksData = marksResponse.data.data;
    const excelData = prepareDataWithSubjectCodeForExcel(marksData);

    const ws = xlsx.utils.json_to_sheet(excelData, { cellDates: true });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

    // Use compression options
    const options = { bookType: "xlsx", type: "buffer", compression: true };
    const buffer = xlsx.write(wb, options);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="all_Student_marks_data.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const prepareDataWithSubjectCodeForExcel = (data) => {
  return data.map((item) => ({
    RegistrationNumber: item.registration_number || "N/A",
    email: item.email || "N/A",
    name: item.name || "N/A",
    "Subject Code": item.subject_code,
    Subject: item.subject_name || "N/A",
    "Assignment 1": item.assignments[0]?.mk || "N/A",
    "OutOff 1": item.assignments[0]?.tm || "N/A",
    Atps1: item.assignments[0]?.atmpt || "N/A",
    "Assignment 2": item.assignments[1]?.mk || "N/A",
    "OutOff 2": item.assignments[1]?.tm || "N/A",
    Atps2: item.assignments[1]?.atmpt || "N/A",
    "Total Marks": item.assignments.reduce((acc, assignment) => acc + (Number(assignment.mk) || 0), 0),
    "OutOff Total": item.assignments.reduce((acc, assignment) => acc + (Number(assignment.tm) || 0), 0),
    Updated: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "N/A",
  }));
};

app.get('/downloadCsv', async (req, res) => {
  try {
    const marksResponse = await axios.get("http://localhost:7000/getStudentDatawithsubjectCode");
    const marksData = marksResponse.data.data;
    const csvData = prepareDataWithSubjectCodeForCsv(marksData);

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="all_Student_marks_data.csv"');
    res.send(csv);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const prepareDataWithSubjectCodeForCsv = (data) => {
  return data.map((item) => ({
    RegistrationNumber: item.registration_number || "N/A",
    Email: item.email || "N/A",
    Name: item.name || "N/A",
    "Subject Code": item.subject_code,
    Subject: item.subject_name || "N/A",
    "Assignment 1 Marks": item.assignments[0]?.mk || "N/A",
    "Assignment 1 OutOf": item.assignments[0]?.tm || "N/A",
    "Assignment 1 Attempts": item.assignments[0]?.atmpt || "N/A",
    "Assignment 2 Marks": item.assignments[1]?.mk || "N/A",
    "Assignment 2 OutOf": item.assignments[1]?.tm || "N/A",
    "Assignment 2 Attempts": item.assignments[1]?.atmpt || "N/A",
    "Total Marks": item.assignments.reduce((acc, assignment) => acc + (Number(assignment.mk) || 0), 0),
    "Total OutOf": item.assignments.reduce((acc, assignment) => acc + (Number(assignment.tm) || 0), 0),
    Updated: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "N/A",
  }));
};


const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
