const {PdfGen} = require('../src/index');
console.log("########## HANDLER INFOS ##########\n");
console.log(JSON.stringify(PdfGen.handlerInfo(), null, 2));
console.log("########## PAGE INFOS ##########\n");
console.log(JSON.stringify(PdfGen.pageInfo(), null, 2));
