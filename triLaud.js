"use strict";
const { ChatClient } = require("@kararty/dank-twitch-irc");
const player = require("node-wav-player");
const fs = require("fs");
const os = require("os");
const chalk = require("chalk");
const http = require("http");
const process = require("process");
const winston = require("winston");
const got = require("got");
const { tableCSS, detectLineEndings, gftime, memusage, sleep } = require("./util.js");
global.trl = new Object;
let conf, ptl;
let twd="./";
const joinDelay = 580; //in ms, max 20 joins per 10 seconds. 
let channels = [], activechannels = [], chgifts=[], oilers=[];
let joinerStatus = 0;
let counters = {anon: 0, self: 0, normal: 0};

LoadConf();
trl.conf = conf;

if(conf.log2file){
	try { ptl = winston.createLogger({
		level: "info",
		format: winston.format.simple(),
		transports: [
			new winston.transports.Console({level: "info"}),
			new winston.transports.File({filename: "trilaud-errors.log", level: "error"}),
			new winston.transports.File({filename: "trilaud-combined.log", level: "info"})
			]
		});
	}
	catch(err){
		console.warn(`Fatál: cannot create logger: ${err}`);
		console.warn(`If the error was because of file permission errors fix the permissions on the program's folder or disable file logging`);
		process.exit(1);
	}
} else {
	ptl = winston.createLogger({
		level: "info",
		format: winston.format.cli(),
		transports: [ new winston.transports.Console({level: "info"}) ]});
}

if(conf.autoreplyModule){
	let failed = false;
	try{
		trl.autoreply = require(conf.autoreplyModule);
	}
	catch(err){
		ptl.error(`Unable to load autoreply module: ${err}`);
		failed = true;
	}
	if(!failed){
		ptl.warn(`Autoreply module ${conf.autoreplyModule} loaded successfully`);
	}
}

process.on("SIGUSR2", ReloadChannels);
if(typeof(conf.textcolors)==="undefined"){
	ptl.warn(`<warn> Configuration setting textcolors is missing, not colorizing output. If you want colors add it to config and set it to true. See config.js.example for details.`);
	chalk.level = 0;
} else {
	if(conf.textcolors===false)
		chalk.level = 0;
}

try{
	fs.writeFileSync(twd+"pid", process.pid.toString());
}
catch(err){
	ptl.error(chalk.red(`<error> Unable to write pid to file: ${err}`));
}

ptl.warn(`<startup> TriLaud v0.1.3 starting up at ${gftime()}`);
ptl.info(`<startup> System: ${os.platform} @ ${os.hostname}, node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);

if(conf.pingsound==="")
	ptl.warn(chalk.yellow(`<warn> pingsound setting is empty in config.js. No sound will be played when you get pinged`));
if(conf.giftsound==="")
	ptl.warn(chalk.yellow(`<warn> giftsound setting is empty in config.js. No sound will be played when you get a gift`));
if(typeof(conf.restartOnCapError)==="undefined"){
	ptl.warn(chalk.yellow(`<warn> WARNING! Configuration setting restartOnCapError is missing! Please add the option to config. See config.js.example for details.`));
}
if(typeof(conf.httpPort)!="number"){
	ptl.warn(chalk.yellow(`<warn> httpPort config option is missing or invalid, not starting a http server. Reloading under Windows will not be possible.`));
	ptl.warn(chalk.yellow(`<warn> See config.js.example for details of how to add it.`));
} else {
	if(conf.httpPort <= 0 || conf.httpPort > 65535){
		ptl.warn(chalk.yellow(`<warn> httpPort config option is set to 0 or an invalid number, not starting a web server. Set it to any number 1 through 65535 to start it.`));
	} else {
		let thost, httpfailed=false;
		if(!conf.httpHost)
			thost="127.0.0.1";
		else
			thost=conf.httpHost;
		try{
			http.createServer(requestHandler).listen(conf.httpPort, thost);
		}
		catch(err){
			httpfailed=true;
			ptl.error(chalk.redBright(`<err> Unable to start web server at port ${conf.httpPort}: ${err}`));
			ptl.error(chalk.redBright(`<err> Web functions (including reloading under Windows) will not be usable!`));
		}
		if(!httpfailed){
			ptl.warn(chalk.green(`<http> server listening at ${thost} port ${conf.httpPort}`));
		}
	}
}


const client = new ChatClient({password: "oauth:"+conf.oauth});
client.on("connecting", onConnecting);
client.on("connect", onConnect);
client.on("ready", onReady);
client.on("close", onClose);
client.on("error", onError);
client.on("PRIVMSG", incomingMessage);
client.on("USERNOTICE", onUserNotice);
client.on("RECONNECT", onReconnect);

trl.client = client;

function onReconnect(){
	ptl.info(`<cc> TMI requested reconnect, reconnecting...`);
}

function onConnecting(){
	ptl.info(`<cc> Connecting to TMI`);
}
function onConnect(){
	ptl.info(chalk.green(`<cc> Connected!`));
	ptl.info(`<cc> Logging in...`);
}

async function onReady(){
	ptl.info(chalk.green(`<cc> Logged in! Chat module ready.`));
	let ident;
	try{
		ident = await whoami();
	}
	catch(err){
		ptl.error(chalk.red(`Error while trying to read the identity of your user: ${err}`));
		ptl.error(chalk.red(`triLaud cannot continue, terminating.`));
		process.exit(1);
	}
	trl.identity = ident;
	ptl.info(chalk.green(`Found identity: ${ident.login}(${ident.display_name}), UID ${ident.id}`));
	JoinChannels();
}

function onClose(){
	ptl.warn(chalk.yellow(`<cc> Connection to TMI was closed.`));
}
function onError(inErr){
	ptl.error(chalk.redBright(`<cc> Chatclient error detected: ${inErr}`));
	if (inErr.name==="LoginError"){
		ptl.error(chalk.redBright(`<cc> Login error detected, cannot continue. Terminating application.`));
		process.exit(1);
	}
	if(inErr.name==="CapabilitiesError"){
		if(conf.restartOnCapError){
			ptl.error(chalk.redBright(`<cc> Capabilities error detected. Terminating application as per the configuration setting.`));
			process.exit(1);
		} else {
			ptl.warn(chalk.yellow(`<cc> Capabilities error detected, but not doing anything because the configuration setting says no.`));
			ptl.warn(chalk.yellow(`<cc> If the program seems to not do anything/you disappear from chat/messages stop coming it's advised to restart it.`));
			return;
		}
			
	}
	if(inErr.name==="ConnectionError"){
		ptl.error(chalk.redBright(`<cc> Network error detected, restarting. If this error persists check if your internet connection is operational.`));
		ptl.error(chalk.redBright(`<cc> If everything seems OK on your side the error might be on Twitch's side.`));
		process.exit(1);
	}
	if(inErr.name==="ReconnectError"){
		ptl.error(chalk.redBright(`<cc> Twitch requested us to reconnect, but there was an error doing so: ${inErr}`));
		ptl.error(chalk.redBright(`<cc> Restarting application as a safety measure`));
		process.exit(0);
	}
	
}

async function onUserNotice(inMsg){
	if(inMsg.isSubgift() || inMsg.isAnonSubgift()){
		if (inMsg.eventParams.recipientUsername === trl.identity.login || inMsg.eventParams.recipientUsername === trl.identity.display_name){
			ptl.info(chalk.magenta(`[${gftime()}] PagMan YOU GOT A GIFT IN #${inMsg.channelName} FROM ${inMsg.displayName || 'an anonymous gifter!'}`));
			counters.self++;
			if(conf.giftsound.length>0){
				try { await player.play({path: conf.giftsound}); }
				catch(err){
					ptl.error(chalk.redBright(`<soundplayer> Gift sound playback failed: ${err}`));
				}
			}
		}
		else {
			ptl.info(`[${gftime()}] ${inMsg.displayName || 'An anonymous gifter'} gifted a sub to ${inMsg.eventParams.recipientUsername} in #${inMsg.channelName}`);
			if(inMsg.displayName === "AnAnonymousGifter")
				counters.anon++;
			else
				counters.normal++;
		}
		registerGift(inMsg.channelName, inMsg.displayName);
	}
}

async function incomingMessage(inMsg){
	if(!conf.alertOnPings) return;
	let sender 	= inMsg.senderUsername.toLowerCase();
	if(sender === trl.identity.login) return;
	let message = String(inMsg.messageText);
	let channel = inMsg.channelName;
	const rx = new RegExp(trl.identity.login, "i");
	const rx2 = new RegExp(trl.identity.display_name, "i");
	if(rx.test(message) || rx2.test(message)){
		ptl.info(chalk.magenta(`[${gftime()}] ${sender} pinged you in #${channel}: ${message}`));
		if(conf.pingsound.length>0){
			try { await player.play({path: conf.pingsound}); }
			catch(err){
				ptl.error(chalk.redBright(`<soundplayer> Ping sound playback failed: ${err}`));
			}
		}
	}
	if(trl.autoreply){
		try{
			trl.autoreply.handleMessage(inMsg);
		}
		catch(err){
			ptl.error(`autoreply failed: ${err}`);
		}
	}
}

client.connect();

function LoadChannels(inFile){
	let buff, inch, le, rv=0;
	try{
		buff = fs.readFileSync(inFile);
	}
	catch(err){
		ptl.error(chalk.redBright(`<error> LoadChannels: unable to read ${inFile}: ${err}`));
		return -1;
	}
	if(buff.length<3){
		ptl.warn(chalk.yellow(`<warn> channels.txt is empty or contains no valid channel adata`));
		return -1;
	}
	buff = buff.toString();
	switch(detectLineEndings(buff)){
		case "CR":
			le = "\r";
			break;
		case "LF":
			le = "\n";
			break;
		case "CRLF":
			le = "\r\n";
			break;
		case "NONE":
			le = " ";
			break;
		default:
			//NaM
			break;
	}
	buff = buff.split(le);
	for(let b of buff){
		inch = b.trim().toLowerCase();
		if(inch.length<3) continue;
		if(channels.findIndex(c=> c===inch) !== -1){
			//ptl(`<loadchannels> Channel ${inch} is already in the array, skipping`);
		} else {
			channels.push(inch);
			rv++;
		}
	}
	return rv;
}

async function JoinChannels(){
	joinerStatus = 1;
	let isfailed=0, stime, ptime;
	LoadChannels(twd+"/channels.txt");
	for(let c of channels){
		if(activechannels.findIndex(ac => ac === c)===-1){
			isfailed = 0;
			stime = new Date;
			try { await client.join(c); }
			catch(err){
				//JoinError's are reported by the onError callback, so no need to report errors here
				//ptlw(chalk.redBright(`<error> Error while trying to join ${c}: ${err}`));
				isfailed=1;
			}
			finally{
				if(!isfailed){
					ptl.info(chalk.green(`Successfully joined channel ${c}`));
					activechannels.push(c);
					ptime = joinDelay-(new Date - stime);
					if(ptime>0) await sleep(ptime);
				}
			}
		}
	}
	joinerStatus = 0;
}

function ReloadChannels(){
	if(joinerStatus === 0){
		ptl.warn(chalk.cyan(`[${gftime()}] Received SIGUSR2S, reloading channels`));
		JoinChannels();
	} else {
		ptl.warn(chalk.yellow(`[${gftime()}] Received SIGUSR2S, but the joiner process is busy. Not reloading channels.`));
	}
}


function registerGift(inch, unick){
	let i = chgifts.findIndex(c => c.name === inch);
	if(i===-1){
		chgifts.push({name: inch, amount: 1});
	} else {
		chgifts[i].amount++;
	}
	i = oilers.findIndex(o => o.name === unick);
	if(i===-1){
		oilers.push({name: unick, amount: 1});
	} else {
		oilers[i].amount++;
	}
}

function LoadConf(){
	let i;
	i = process.argv.findIndex(a => a==="-d");
	if(i===-1){
		try {	
		conf = require("./config.js").trilaud_config;
		}
		catch(err){
			console.error("The configuration file config.js is missing or invalid. Please create the file or fix errors in the existing one. The full error was this:");
			console.err(err);
			process.exit(1);
		}
		return;
	}
	if(!process.argv[i+1]){
		//intentionally using console.log here
		console.log(`Usage: node triLaud.js -d [config file dir]`);
		process.exit(0);
	}
	try{
		conf = require("./"+process.argv[i+1]+"/config.js").trilaud_config;
	}
	catch(err){
		console.error("The configuration file config.js (in the specified directory) is missing or invalid. Please create the file or fix errors in the existing one. The full error was this:");
		console.error(err);
		process.exit(1);
	}	
	twd="./"+process.argv[i+1]+"/";
	
	if(!conf.clientid || conf.clientid===""){
		console.error("Missing or unconfigured setting 'clientid'. Please update your config or set the value.");
		console.error("See config.js.example on explanation what you need.");
		process.exit(1);
	}
	return;
}

function whoami(){
return new Promise(async (resolve, reject) => {
	const https_options = {
		url: "https://api.twitch.tv/helix/users",
		method: "GET",
		headers:{
			'Authorization': 'Bearer '+conf.oauth,
			'Client-ID': conf.clientid
		},
		retry: 2,
		timeout: 2000
	};
	let retval;
	try{
		retval = await got(https_options);
	}
	catch(err){
		reject(err);
		return;
	}
	const rdata = JSON.parse(retval.body);
	if(rdata.data.length === 0) reject("unhandled twitch API error (cannot look up own identity)");
	else resolve(rdata.data[0]);	
});
}


async function requestHandler(req, res){
	ptl.info(`<http> Incoming request for "${req.url}"`);
	let inurl = req.url.split("?");
	let icon=undefined;
	switch(inurl[0]){
		case "/index.htm":
		case "/index.html":
		case "/index":
		case "/":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(genIndexPage());
			res.end();
			break;
		case "/reload":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache'});
			if(joinerStatus != 0){
				ptl.warn(chalk.yellow(`<http> Reload requested, but the joiner process is currently active. Not reloading.`));
				res.write(getReloadReply(1));
			} else {
				ptl.warn(chalk.cyan(`<http> Reloading channels`));
				JoinChannels();
				res.write(getReloadReply(0));
			}	
			res.end();
			break;
		case "/stats":
		case "/stats/":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			res.write(`<html><head><title>triLaud stats</title></head>\n<body><a href="stats/channel">Channel stats</a> <a href="stats/oilers">Gifter stats</a>\n</body></html>`);
			res.end();
			break;
		case "/stats/json":
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(genStatsJson());
			res.end();
			break;	
		case "/stats/channel":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(genChannelStats());
			res.end();
			break;
		case "/stats/channel/json":
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(getChannelStatsJSON());
			res.end();
			break;
		case "/stats/oilers":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(genGifterStats());
			res.end();
			break;
		case "/stats/oilers/json":
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(genGifterStatsJSON());
			res.end();
			break;	
		case "/api/reload":
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			if(joinerStatus != 0){
				ptl.warn(chalk.yellow(`<http> Reload via API requested, but the joiner process is currently active. Not reloading.`));
				res.write(JSON.stringify({success: false, status: "already-reloading", msg: "Joiner process is currently busy loading/reloading channels. Please try again later."}));
			} else {
				ptl.warn(chalk.cyan(`<http> Reloading channels via APU`));
				JoinChannels();
				res.write(JSON.stringify({success: true, status: "reload-cmd-sent", msg: "Reload command successfully issued."}));
			}	
			res.end();
			break;
		case "/favicon.ico":
			try {
				icon = fs.readFileSync("./favicon.ico");
			}
			catch(err){
				ptl.warn(chalk.yellow("<http> Cannot read favicon, sending back 404"));
			}
			if(icon){
				res.writeHead(200, {'Content-Type': 'image/vnd.microsoft.icon'});
				res.write(icon);
				res.end();
			} else {
				res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache'});
				res.write("404 - Content not found");
				res.end();
			}
			break;
		case "/teapot":
		case "/teapot/":
			res.writeHead(418, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write("🆗 🥚 🍵 ⏲ ");
			res.end();
			break;
		case "/teapot/json":
			res.writeHead(418, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(JSON.stringify({success: false, status: "teapot", message: "🆗 🥚 🍵 ⏲ "}));
			res.end();
			break;
		default:
			ptl.warn(`<http> 404 - Invalid path ${inurl[0]}`);
			res.writeHead(404, {'Content-Type': 'te', 'Cache-Control': 'no-cache'});
			res.write("404 - Content not found");
			res.end();
			break;
	}
}

function genIndexPage(){
return `
<html>
<head><title>triLaud - ${trl.identity.login}@${os.hostname()} (${os.platform()})</title></head>
<body>
<b>Current user: <code>${trl.identity.login} (${trl.identity.display_name})</code></b><br>
<b>Active channels: <code>${activechannels.length}</code></b><br>
<b>Process memory usage: <code>${memusage()}</code></b><br>
<b>Gifts you received: ${counters.self}</b><br>
<b>Anonymous gifts to others: ${counters.anon}</b><br>
<b>Non-anon gifts to to others: ${counters.normal}</b><br>
<b>Total gifts during this session: ${counters.anon+counters.normal+counters.self}</b><br>
<a href="stats/channel">Channel stats</a> <a href="stats/oilers">Gifter stats</a><br><br>
<a href="reload">Click here to reload channels from channels.txt</a>
</body></html>`;
}

function genStatsJson(){
	let retval = {
		host: os.hostname(),
		platform: os.platform(),
		username: trl.identity.login,
		chActive: activechannels.length,
		memusage: process.memoryUsage().rss,
		gifts: {
			self: counters.self,
			anon: counters.anon,
			other: counters.normal
		},
		reloadRunning: joinerStatus!=0 };
	return JSON.stringify(retval);	
}

function genChannelStats(){
	let retval=`<html>\n<head><title>triLaud - ${trl.identity.login}@${os.hostname} (${os.platform}) - Channel statistics</title>\n${tableCSS}\n</head>\n<body>\n`;
	if(chgifts.length===0){
		retval+=`No gifts so far PepeHands</body></html>`;
		return retval;
	} else {
		retval += `<table style="border-collapse: collapse; border: 1px solid black">\n<tr><td>Channel name</td><td>Gifts count<br>(in this session)</td></tr>\n`;
		let orderedgifts = chgifts.sort((a, b) => b.amount-a.amount);
		for(const c of orderedgifts){
			retval += `<tr><td>${c.name}</td><td>${c.amount}</td></tr>\n`;
		}
		retval += `</table></body></html>`;
		return retval;
	}
}

function getChannelStatsJSON(){
	let orderedgifts = chgifts.sort((a, b) => b.amount-a.amount);
	let retval = [];
	for(const c of orderedgifts){
		retval.push({name: c.name, total: c.amount});
	}
	return JSON.stringify(retval);
}

function genGifterStats(){
	let retval=`<html>\n<head><title>triLaud - ${trl.identity.login}@${os.hostname} (${os.platform}) - Gifter stats AbdulPls</title>\n${tableCSS}\n</head>\n<body>\n`;
	if(oilers.length===0){
		retval+=`No gifts so far PepeHands<br><a href="javascript:history.back()">Go back to main page</a></body></html>`;
		return retval;
	} else {
		retval += `<table>\n<tr><td>Gifter's name</td><td>Gift count<br>(across all active channels)</td></tr>\n`;
		let orderedgifts = oilers.sort((a, b) => b.amount-a.amount);
		for(const c of orderedgifts){
			retval += `<tr><td>${c.name}</td><td>${c.amount}</td></tr>\n`;
		}
		retval += `</table></body></html>`;
		return retval;
	}
}

function genGifterStatsJSON(){
	let orderedgifts = oilers.sort((a, b) => b.amount-a.amount);
	let retval = [];
	for(const c of orderedgifts){
		retval.push({name: c.name, total: c.amount});
	}
	return JSON.stringify(retval);
}


function getReloadReply(cStat){
let retval = `
<html>
<head><title>triLaud@${os.hostname} (${os.platform}) - Reloaded</title></head>
<body>`;
if(cStat!=1)
	retval += `<b>Channel reload command issued successfully.<b><br>`;
else
	retval += `<b>triLaud is currently busy joining new or the initial set of channels. Please try again later.<b><br>`;
retval += `<a href="index">Main page</a>
</body></html>`;
return retval;	
}
