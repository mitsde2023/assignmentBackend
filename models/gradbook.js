const { DataTypes } = require('sequelize');
const sequelize = require('../config');


const gradbook = sequelize.define('gradbook', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    reg_id: DataTypes.STRING,
    exam_date: DataTypes.STRING,
    sem: DataTypes.STRING,
    Subj_code: DataTypes.STRING,
    Subject: DataTypes.STRING,
    Credits: DataTypes.STRING,
    Internal_marks: DataTypes.STRING,
    External_Marks: DataTypes.STRING,
    scaledown: DataTypes.STRING,
    total: DataTypes.STRING,
    grade_point: DataTypes.STRING,
    grade: DataTypes.STRING,
    fileUdatedDate: DataTypes.DATE,
}, {
    tableName: 'gradbook',
    timestamps: false,
});



module.exports = gradbook;