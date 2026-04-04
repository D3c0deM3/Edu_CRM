const expressTeacherSalary = require('express');
const routerTeacherSalary = expressTeacherSalary.Router();
const teacherSalaryController = require('../controllers/teacherSalaryController');

routerTeacherSalary.get('/overview', teacherSalaryController.getSalaryOverview);

routerTeacherSalary.get('/rates', teacherSalaryController.getSalaryRates);
routerTeacherSalary.post('/rates', teacherSalaryController.createSalaryRate);
routerTeacherSalary.put('/rates/:id', teacherSalaryController.updateSalaryRate);
routerTeacherSalary.delete('/rates/:id', teacherSalaryController.deleteSalaryRate);

routerTeacherSalary.get('/payments', teacherSalaryController.getSalaryPayments);
routerTeacherSalary.post('/payments', teacherSalaryController.createSalaryPayment);
routerTeacherSalary.put('/payments/:id', teacherSalaryController.updateSalaryPayment);
routerTeacherSalary.delete('/payments/:id', teacherSalaryController.deleteSalaryPayment);

module.exports = routerTeacherSalary;
