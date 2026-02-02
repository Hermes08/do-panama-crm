const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('CRM_Exportacion_Completa_20260202.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(JSON.stringify(data, null, 2));
