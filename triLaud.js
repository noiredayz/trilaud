"use strict";
const { ChatClient } = require("dank-twitch-irc");
const player = require("node-wav-player");
const df = require("date-fns");
const fs = require("fs");
const os = require("os");
const conf = require("./config.js").trilaud_config;
const ptl = console.log;
const ptlw = console.warn;
let channels = [];
let activechannels = [];

process.on("SIGUSR1", ReloadChannels);
try{
	fs.writeFileSync("./pid", process.pid);
}
catch(err){
	ptlw(`<error> Unable to write pid to file: ${err}`);
}

ptl(`<startup> TriLaud v0.1 starting up at ${gftime()}`);
ptl(`<startup> System: ${os.platform} @ ${os.hostname}, node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);

if(conf.pingsound==="")
	ptlw(`<warn> pingsound setting is empty in config.js. No sound will be played when you get pinged`);
if(conf.giftsound==="")
	ptlw(`<warn> giftsound setting is empty in config.js. No sound will be played when you get a gift`);

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
	prl(`<cc> TMI requested reconnect, reconnecting...`);
}

function onConnecting(){
	ptl(`<cc> Connecting to TMI`);
}
function onConnect(){
	ptl(`<cc> Connected!`);
	ptl(`<cc> Logging in...`);
}

function onReady(){
	ptl(`<cc> Logged in! Chat module ready.`);
	JoinChannels();
}

function onClose(){
	ptlw(`<cc> Connection to TMI was closed.`);
}
function onError(inErr){
	ptl(`<cc> Chatclient error detected: ${inErr}`);
	if (inErr.name==="CapabilitiesError" || inErr.name==="LoginError"){
		ptl(`<cc> Capability error or login error detected, cannot continue. Terminating application.`);
		process.exit(1);
	}
	if(inErr.name==="ReconnectError"){
		ptl(`<cc> Twitch requested us to reconnect, but there was an error doing so: ${inErr}`);
		ptl(`<cc> Restarting application as a safety measure`);
		process.exit(0);
	}
}

async function onUserNotice(inMsg){
	if(inMsg.isSubgift() || inMsg.isAnonSubgift()){
		if (inMsg.eventParams.recipientUsername.toLowerCase() === conf.username.toLowerCase()){
			ptl(`[${gftime()}] PagMan YOU GOT A GIFT IN #${inMsg.channelName} FROM ${inMsg.displayName || 'an anonymous gifter!'}`);
		if(config.giftsound.length>0){
					try { await player.play({path: conf.giftsound}); }
					catch(err){
					ptlw(`<soundplayer> Sound playback failed: ${err}`);
					}
				}
		}
		else {
			ptl(`[${gftime()}] ${inMsg.displayName || 'An anonymous gifter'} gifted a sub to ${inMsg.eventParams.recipientUsername} in #${inMsg.channelName}`);
		}
	}
}

async function incomingMessage(inMsg){
	let sender 	= inMsg.senderUsername.toLowerCase();
	let message = String(inMsg.messageText);
	let channel = inMsg.channelName;
	//todo: nam
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
		ptlw(`<error> LoadChannels: unable to read ${inFile}: ${err}`);
		return -1;
	}
	if(buff.length<3){
		ptlw(`<warn> channels.txt is empty or contains no valid channel adata`);
		return -1;
	}
	switch(conf.lines.toLowerCase()){
		case "lf":
		case "\n":
		case "unix":
			le="\n";
			break;
		case "cr":
		case "\r":
		case "mac":
			le="\r";
			break;
		case "crlf":
		case "\r\n":
		case "dos":
		case "win":
		case "windows":
			le="\r\n";
			break;
		default:
			le=os.EOL;
			break;
		}
	buff = buff.toString();
	buff = buff.split(le);
	for(let b of buff){
		inch = b.trim();
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
	let isfailed=0;
	LoadChannels("channels.txt");
	for(let c of channels){
		if(activechannels.findIndex(ac => ac === c)===-1){
			isfailed = 0;
			try { await client.join(c); }
			catch(err){
				ptlw(`<error> Error while trying to join ${c}: ${err}`);
				isfailed=1;
			}
			finally{
				if(!isfailed){
					ptl(`Successfully joined channel ${c}`);
					activechannels.push(c);
				}
			}
		}
	}
}

function ReloadChannels(){
	ptl(`[${gftime()}] Received SIGUSR1, reloading channels`);
	JoinChannels();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

