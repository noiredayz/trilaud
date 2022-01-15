const df = require("date-fns");
const process = require("process");

const tableCSS = `<style>table {border-collapse: collapse; border: 2px solid black;} tr {border: 2px solid black;} td {border: 1px solid black;}</style>`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectLineEndings(inTxt){
	const cr	= inTxt.split("\r").length;
	const lf	= inTxt.split("\n").length;
	const crlf	= inTxt.split("\r\n").length;
	
	if(cr+lf===0) return "NONE";
	if(cr === crlf && lf === crlf) return "CRLF";
	if(cr>lf) return "CR";
	else return "LF";
}

function gftime(){
	switch (trl.conf.dateformat){
		case "DMY":
			return df.format(new Date, "dd-MM-yyyy HH:mm:ss");
		case "MDY":
			return df.format(new Date, "MM-dd-yyyy HH:mm:ss");	
		default:
			return df.format(new Date, "yyyy-MM-dd HH:mm:ss");
		}
}

function memusage(){
	let gg = Number(process.memoryUsage().rss)/1024/1024;
	return `${gg.toFixed(2)}MiB`;
}

exports.tableCSS = tableCSS;
exports.detectLineEndings = detectLineEndings;
exports.gftime = gftime;
exports.memusage = memusage;
exports.sleep = sleep;
