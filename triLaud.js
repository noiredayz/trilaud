"use strict";
const { ChatClient } = require("dank-twitch-irc");
const player = require("node-wav-player");
const df = require("date-fns");
const fs = require("fs");
const os = require("os");
const chalk = require("chalk");
const http = require("http");
const conf = require("./config.js").trilaud_config;
const ptl = console.log;
const ptlw = console.warn;
const joinDelay = 580; //in ms, max 20 joins per 10 seconds. 
let channels = [], activechannels = [], chgifts=[], oilers=[];
let joinerStatus = 0;
let counters = {anon: 0, self: 0, normal: 0};

process.on("SIGUSR2", ReloadChannels);
if(typeof(conf.textcolors)==="undefined"){
	ptlw(`<warn> Configuration setting textcolors is missing, not colorizing output. If you want colors add it to config and set it to true. See config.js.example for details.`);
	chalk.level = 0;
} else {
	if(conf.textcolors===false)
		chalk.level = 0;
}

try{
	fs.writeFileSync("./pid", process.pid);
}
catch(err){
	ptlw(chalk.red(`<error> Unable to write pid to file: ${err}`));
}

ptl(`<startup> TriLaud v0.1.1 starting up at ${gftime()}`);
ptl(`<startup> System: ${os.platform} @ ${os.hostname}, node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);

if(conf.pingsound==="")
	ptlw(chalk.yellow(`<warn> pingsound setting is empty in config.js. No sound will be played when you get pinged`));
if(conf.giftsound==="")
	ptlw(chalk.yellow(`<warn> giftsound setting is empty in config.js. No sound will be played when you get a gift`));
if(typeof(conf.restartOnCapError)==="undefined"){
	ptlw(chalk.yellow(`<warn> WARNING! Configuration setting restartOnCapError is missing! Please add the option to config. See config.js.example for details.`));
}
if(typeof(conf.httpPort)!="number"){
	ptlw(chalk.yellow(`<warn> httpPort config option is missing or invalid, not starting a http server. Reloading under Windows will not be possible.`));
	ptlw(chalk.yellow(`<warn> See config.js.example for details of how to add it.`));
} else {
	if(conf.httpPort <= 0 || conf.httpPort > 65535){
		ptlw(chalk.yellow(`<warn> httpPort config option is set to 0 or an invalid number, not starting a web server. Set it to any number 1 through 65535 to start it.`));
	} else {
		let thost;
		if(!conf.httpHost)
			thost="localhost";
		else
			thost=conf.httpHost;
		try{
			http.createServer(requestHandler).listen(conf.httpPort, thost);
		}
		catch(err){
			ptlw(chalk.redBright(`<err> Unable to start web server at port ${conf.httpPort}: ${err}`));
			ptlw(chalk.redBright(`<err> Web functions (including reloading under Windows) will not be usable!`));
		}
	}
}


const client = new ChatClient({username: conf.username, password: conf.oauth});
client.on("connecting", onConnecting);
client.on("connect", onConnect);
client.on("ready", onReady);
client.on("close", onClose);
client.on("error", onError);
client.on("PRIVMSG", incomingMessage);
client.on("USERNOTICE", onUserNotice);
client.on("RECONNECT", onReconnect);

function onReconnect(){
	ptl(`<cc> TMI requested reconnect, reconnecting...`);
}

function onConnecting(){
	ptl(`<cc> Connecting to TMI`);
}
function onConnect(){
	ptl(chalk.green(`<cc> Connected!`));
	ptl(`<cc> Logging in...`);
}

function onReady(){
	ptl(chalk.green(`<cc> Logged in! Chat module ready.`));
	JoinChannels();
}

function onClose(){
	ptlw(chalk.yellow(`<cc> Connection to TMI was closed.`));
}
function onError(inErr){
	ptl(chalk.redBright(`<cc> Chatclient error detected: ${inErr}`));
	if (inErr.name==="LoginError"){
		ptl(chalk.redBright(`<cc> Login error detected, cannot continue. Terminating application.`));
		process.exit(1);
	}
	if(inErr.name==="CapabilitiesError"){
		if(conf.restartOnCapError){
			ptl(chalk.redBright(`<cc> Capabilities error detected. Terminating application as per the configuration setting.`));
			process.exit(1);
		} else {
			ptl(chalk.yellow(`<cc> Capabilities error detected, but not doing anything because the configuration setting says no.`));
			ptl(chalk.yellow(`<cc> If the program seems to not do anything/you disappear from chat/messages stop coming it's advised to restart it.`));
			return;
		}
			
	}
	if(inErr.name==="ReconnectError"){
		ptl(chalk.redBright(`<cc> Twitch requested us to reconnect, but there was an error doing so: ${inErr}`));
		ptl(chalk.redBright(`<cc> Restarting application as a safety measure`));
		process.exit(0);
	}
}

async function onUserNotice(inMsg){
	if(inMsg.isSubgift() || inMsg.isAnonSubgift()){
		if (inMsg.eventParams.recipientUsername.toLowerCase() === conf.username.toLowerCase()){
			ptl(chalk.magenta(`[${gftime()}] PagMan YOU GOT A GIFT IN #${inMsg.channelName} FROM ${inMsg.displayName || 'an anonymous gifter!'}`));
			counters.self++;
			if(conf.giftsound.length>0){
				try { await player.play({path: conf.giftsound}); }
				catch(err){
					ptlw(chalk.redBright(`<soundplayer> Gift sound playback failed: ${err}`));
				}
			}
		}
		else {
			ptl(`[${gftime()}] ${inMsg.displayName || 'An anonymous gifter'} gifted a sub to ${inMsg.eventParams.recipientUsername} in #${inMsg.channelName}`);
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
	let message = String(inMsg.messageText);
	let channel = inMsg.channelName;
	const rx = new RegExp(conf.username, "i");
	if(rx.test(message) && sender!=conf.username){
		ptl(chalk.magenta(`[${gftime()}] ${sender} pinged you in #${channel}: ${message}`));
		if(conf.pingsound.length>0){
			try { await player.play({path: conf.pingsound}); }
			catch(err){
				ptlw(chalk.redBright(`<soundplayer> Ping sound playback failed: ${err}`));
			}
		}
	}
}

client.connect();

function gftime(){
	return df.format(new Date, "yyyy-MM-dd HH:mm:ss");
}

function LoadChannels(inFile){
	let buff, inch, le, rv=0;
	try{
		buff = fs.readFileSync(inFile);
	}
	catch(err){
		ptlw(chalk.redBright(`<error> LoadChannels: unable to read ${inFile}: ${err}`));
		return -1;
	}
	if(buff.length<3){
		ptlw(chalk.yellow(`<warn> channels.txt is empty or contains no valid channel adata`));
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
	LoadChannels("channels.txt");
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
					ptl(chalk.green(`Successfully joined channel ${c}`));
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
		ptl(chalk.cyan(`[${gftime()}] Received SIGUSR2S, reloading channels`));
		JoinChannels();
	} else {
		ptl(chalk.yellow(`[${gftime()}] Received SIGUSR2S, but the joiner process is busy. Not reloading channels.`));
	}
}

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

async function requestHandler(req, res){
	ptl(`<http> Incoming request for "${req.url}"`);
	let inurl = req.url.split("?");
	switch(inurl[0]){
		case "/index.htm":
		case "/index.html":
		case "/":
			res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'});
			res.write(genIndexPage());
			res.end();
			break;
		case "/reload":
			res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'});
			if(joinerStatus != 0){
				ptl(chalk.yellow(`<http> Reload requested, but the joiner process is currently active. Not reloading.`));
				res.write(getReloadReply(1));
			} else {
				ptl(chalk.cyan(`<http> Reloading channels`));
				JoinChannels();
				res.write(getReloadReply(0));
			}	
			res.end();
			break;
		case "/stats":
		case "/stats/":
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(`<html><head><title>triLaud stats</title></head>\n<body><a href="stats/channel">Channel stats</a> <a href="stats/oilers">Gifter stats</a>\n</body></html>`);
			res.end();
			break;
		case "/stats/channel":
			res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'});
			res.write(genChannelStats());
			res.end();
			break;
		case "/stats/oilers":
			res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'});
			res.write(genGifterStats());
			res.end();
			break;
		case "/api/reload":
			res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-cache'});
			if(joinerStatus != 0){
				ptl(chalk.yellow(`<http> Reload via API requested, but the joiner process is currently active. Not reloading.`));
				res.write(JSON.stringify({success: false, status: "already-reloading", msg: "Joiner process is currently busy loading/reloading channels. Please try again later."}));
			} else {
				ptl(chalk.cyan(`<http> Reloading channels via APU`));
				JoinChannels();
				res.write(JSON.stringify({success: true, status: "reload-cmd-sent", msg: "Reload command successfully issued."}));
			}	
			res.end();
			break;
		case "/favicon.ico":
			let icon=undefined;
			try {
				icon = fs.readFileSync("./favicon.ico");
			}
			catch(err){
				ptlw(chalk.yellow("<http> Cannot read favicon, sending back 404"));
			}
			if(icon){
				res.writeHead(200, {'Content-Type': 'image/vnd.microsoft.icon'});
				res.write(icon);
				res.end();
			} else {
				res.writeHead(404, {'Content-Type': 'text/plain', 'Cache-Control': 'no-cache'});
				res.write("404 - Content not found");
				res.end();
			}
			break;
		default:
			ptlw(chalk.yellow(`<Router> invalid path ${req.url}, sending back 404`));
			res.writeHead(404, {'Content-Type': 'text/plain', 'Cache-Control': 'no-cache'});
			res.write("404 - Content not found");
			res.end();
			break;
	}
}

function genIndexPage(){
return `
<html>
<head><title>triLaud@${os.hostname} (${os.platform})</title></head>
<body>
<b>Current user: <code>${conf.username}</code></b><br>
<b>Active channels: <code>${activechannels.length}</code></b><br>
<b>Gifts you received: ${counters.self}</b><br>
<b>Anonymous gifts to others: ${counters.anon}</b><br>
<b>Non-anon gifts to to others: ${counters.normal}</b><br>
<b>Total gifts during this session: ${counters.anon+counters.normal+counters.self}</b><br>
<a href="stats/channel">Channel stats</a> <a href="stats/oilers">Gifter stats</a><br><br>
<a href="reload">Click here to reload channels from channels.txt</a>
</body></html>`;
}

function genChannelStats(){
	let retval=`<html>\n<head><title>triLaud@${os.hostname} (${os.platform}) - Channel statistics</title></head>\n<body>\n`;
	if(chgifts.length===0){
		retval+=`No gifts so far PepeHands</body></html>`;
		return retval;
	} else {
		retval += `<table style="border-collapse: collapse;">\n<tr><td>Channel name</td><td>Gifts count<br>(in this session)</td></tr>\n`;
		let orderedgifts = chgifts.sort((a, b) => b.amount-a.amount);
		for(const c of orderedgifts){
			retval += `<tr><td>${c.name}</td><td>${c.amount}</td></tr>\n`;
		}
		retval += `</table></body></html>`;
		return retval;
	}
}

function genGifterStats(){
	let retval=`<html>\n<head><title>triLaud@${os.hostname} (${os.platform}) - Gifter stats AbdulPls</title></head>\n<body>\n`;
	if(oilers.length===0){
		retval+=`No gifts so far PepeHands</body></html>`;
		return retval;
	} else {
		retval += `<table style="border-collapse: collapse;">\n<tr><td>Gifter's name</td><td>Gift count<br>(across all active channels)</td></tr>\n`;
		let orderedgifts = oilers.sort((a, b) => b.amount-a.amount);
		for(const c of orderedgifts){
			retval += `<tr><td>${c.name}</td><td>${c.amount}</td></tr>\n`;
		}
		retval += `</table></body></html>`;
		return retval;
	}
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
retval += `<a href="/">Main page</a>
</body></html>`;
return retval;	
}
