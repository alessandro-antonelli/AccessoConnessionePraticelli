const puppeteer = require('puppeteer');
const ping = require('ping');
const StoreProvider = require('electron-store');
const config = new StoreProvider({name: 'config', encryptionKey: '9YiBu5#lHygy' });

var timer;
var FinestraUI;
var ConnessioneFunzionavaAllUltimoControllo;

const DominiTestati = ['google.com', 'amazon.com', 'microsoft.com', 'facebook.com', 'en.wikipedia.org', 'repubblica.it', 'corriere.it']
var DominiEsito = [];

exports.AvviaMonitoraggio = function(finestra)
{
	FinestraUI = finestra;
	FinestraUI.webContents.send('log', '💡Rinnovo automatico attivato');
	if(timer != null) clearInterval(timer);
	timer = setInterval(IniziaControllo, 60000);
	IniziaControllo();
}

exports.SpegniMonitoraggio = function()
{
	FinestraUI.webContents.send('log', '💤Rinnovo automatico disattivato');
	if(timer != null) { clearInterval(timer); timer = null; }
	FinestraUI = null;
}

function IniziaControllo()
{
	EseguiPing(0);
}

async function ConcludiControllo(ConnessioneFunziona)
{
	ConnessioneFunzionavaAllUltimoControllo = ConnessioneFunziona;
	
	if(ConnessioneFunziona == false)
	{
		FinestraUI.webContents.send('log', '⏰Accesso scaduto! Connessione interrotta');
		var EsitoRinnovo;
		do {
			EsitoRinnovo = await RinnovaLogin();
			if(EsitoRinnovo != 'OK')
			{
				FinestraUI.webContents.send('log', '❌Il tentativo di accesso automatico è fallito! Riprovo... [passaggio non riuscito: ' + EsitoRinnovo + ']');
				await sleep(5000);
			}
		} while(EsitoRinnovo != 'OK' || ConnessioneFunzionavaAllUltimoControllo == true);
		FinestraUI.webContents.send('log', '✅Accesso rinnovato! Connessione ripristinata');
	}

	else
	{
		FinestraUI.webContents.send('log', '🆗Connessione funzionante');
		/*
		TODO codice da scrivere, ammesso che si possa sapere DurataLoginMs

		const DurataLoginMs = ???;
		const UltimoRinnovo = Number(config.get('UltimoRinnovo'));
		const ProxRinnovo = UltimoRinnovo + DurataLoginMs;
		const adesso = (new Date()).getTime();
		if(ProxRinnovo - adesso < 60000)
		{
			// Manca meno di 1 minuto alla scadenza => Monitoraggio ogni secondo
			if(timer != null) clearInterval(timer);
			timer = setInterval(IniziaControllo, 1000);
		} else
		{
			// Manca più di 1 minuto alla scadenza => Monitoraggio ogni 60 secondi
			if(timer != null) clearInterval(timer);
			timer = setInterval(IniziaControllo, 60000);
		}
		*/
	}
}

function EseguiPing(IndiceDaTestare)
{
	ping.sys.probe(DominiTestati[IndiceDaTestare], (isAlive) =>
		{
			DominiEsito[IndiceDaTestare] = isAlive;
			DecidiSeProseguirePing(IndiceDaTestare);
		});
}

function DecidiSeProseguirePing(UltimoTestEseguito)
{
	if (UltimoTestEseguito < DominiTestati.length - 1)
	{
		if (DominiEsito[UltimoTestEseguito]) ConcludiControllo(true);
		else EseguiPing(UltimoTestEseguito + 1);
	}
	else
	{
		if (DominiEsito[UltimoTestEseguito]) ConcludiControllo(true);
		else ConcludiControllo(false);
	}
}

async function RinnovaLogin()
{
	const browser = await puppeteer.launch
	({
		headless: true,
		args: [
			'--disable-dev-shm-usage',
			'--fast-start',
			'--no-sandbox'
		]
	});
	const page = (await browser.pages())[0];

	try {
		await page.goto('http://131.114.101.102/login.php', { waitUntil: 'load' });
	} catch(e) { return 'caricamento pagina'; }

	// Inserisco nome utente
	try
	{
		await page.waitForSelector('#frmValidator > div > div > div:nth-child(1) > input');
		await page.keyboard.type(config.get('username'));
	} catch(e) { return 'inserimento username'; }

	// Inserisco password
	try
	{
		await page.waitForSelector('#frmValidator > div > div > div:nth-child(3) > input');
		await page.keyboard.type(config.get('password'));
	} catch(e) { return 'inserimento password'; }

	try { await page.click('#frmValidator > div > div > button'); }
	catch(e) { return 'click pulsante accedi'; }

	await browser.close();
	config.set('UltimoRinnovo', (new Date()).getTime() );
	return 'OK';
}

function sleep(ms)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}