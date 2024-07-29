const { Sequelize } = require('sequelize');

// const sequelize = new Sequelize('Marks', 'root', 'YourRootPassword', {
//   host: 'localhost',
//   dialect: 'mysql', 
// });

const sequelize = new Sequelize('assig_marksTest', 'dbmasteruser', '%hy3])k$<${G:rY0[k:]>QcOZ;JUvK-C',
    {
        host: 'ls-9ebc19b44f881f32b698f79e8b61368e3f5686a9.cxw76sd6irpv.ap-south-1.rds.amazonaws.com',
        dialect: 'mysql',
    });


module.exports = sequelize;
