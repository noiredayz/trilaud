import { format } from "date-fns";
import process from "process";

export const tableCSS = `<style>table {border-collapse: collapse; border: 2px solid black;} tr {border: 2px solid black;} td {border: 1px solid black;}</style>`;

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function detectLineEndings(inTxt){
	const cr	= inTxt.split("\r").length;
	const lf	= inTxt.split("\n").length;
	const crlf	= inTxt.split("\r\n").length;

	if(cr+lf===0) return "NONE";
	if(cr === crlf && lf === crlf) return "CRLF";
	if(cr>lf) return "CR";
	else return "LF";
}

export function gftime(){
	switch (trl.conf.dateformat){
		case "DMY":
			return format(new Date, "dd-MM-yyyy HH:mm:ss");
		case "MDY":
			return format(new Date, "MM-dd-yyyy HH:mm:ss");
		default:
			return format(new Date, "yyyy-MM-dd HH:mm:ss");
		}
}

export function memusage(){
	let gg = Number(process.memoryUsage().rss)/1024/1024;
	return `${gg.toFixed(2)}MiB`;
}
