const puppeteer = require('puppeteer');
const ping = require('ping');
const { Notification } = require('electron');
const path = require('path');
const StoreProvider = require('electron-store');
var config;

var RinnovatoreAttivo = false;
var TimerCountdown;
var TimerPing;
var FinestraUI;
var ConnessioneFunzionavaAllUltimoControllo;
var UltimoControllo = 0;
var ControlloConnessioneInCorso = false;

const DominiTestati = ['131.114.101.102', 'google.com', 'amazon.com', 'microsoft.com', 'facebook.com', 'en.wikipedia.org', 'repubblica.it', 'corriere.it']
var DominiEsito = [];

exports.AvviaMonitoraggio = function(ChiaveCifratura)
{
	if(RinnovatoreAttivo == false)
	{
		if(config == null) config = new StoreProvider({name: 'config', clearInvalidConfig: true, encryptionKey: ChiaveCifratura });
		RinnovatoreAttivo = true;
		RegistraEvento('💡 Rinnovo automatico attivato', '', false);

		ImpostaProssimoControllo();

		if(TimerCountdown != null) clearInterval(TimerCountdown);
		TimerCountdown = setInterval(ImpostaProssimoControllo, 10000);

		IniziaControlloConnessione();
	}
}

exports.AggiornaFinestraUI = function(finestra)
{
	FinestraUI = finestra;
}

exports.SpegniMonitoraggio = function()
{
	if(RinnovatoreAttivo == true)
	{
		RinnovatoreAttivo = false;
		RegistraEvento('💤 Rinnovo automatico disattivato', '', false);
		if(TimerPing != null) { clearTimeout(TimerPing); TimerPing = null; }
		if(TimerCountdown != null) { clearInterval(TimerCountdown); TimerCountdown = null; }
	}
}

function ImpostaProssimoControllo()
{
	const UltimoRinnovo = config.get('UltimoRinnovo');
	var TempoDaAspettareMs;
	const adesso = (new Date()).getTime();
	const TempoPassatoDaUltimoControllo = (UltimoControllo != null ? adesso - UltimoControllo : MAX_SAFE_INTEGER);

	if(UltimoRinnovo == null || isNaN(UltimoRinnovo) )
	{
		TempoDaAspettareMs = 30000 - TempoPassatoDaUltimoControllo;
		if(FinestraUI != null && !FinestraUI.isDestroyed() ) FinestraUI.webContents.send('DataRinnovo', '?');
	}
	else {
		const DurataLoginMs = 28800000; //8 ore
		const ProxRinnovo = Number(UltimoRinnovo) + DurataLoginMs;
		TempoDaAspettareMs = ProxRinnovo - adesso;

		if(FinestraUI != null && !FinestraUI.isDestroyed() )
		{
			const TestoRinnovo = FormattaTimestampComeData(UltimoRinnovo) + ', scade il ' + FormattaTimestampComeData(ProxRinnovo);
			FinestraUI.webContents.send('DataRinnovo', TestoRinnovo);
		}

		if(TempoDaAspettareMs < 0 && ConnessioneFunzionavaAllUltimoControllo == true)
		{
			config.delete('UltimoRinnovo');
			TempoDaAspettareMs = 30000 - TempoPassatoDaUltimoControllo;
		}
		else
		{
			//Ogni 5 minuti controlla lo stato della connessione (anche se non è ancora arrivato il momento del rinnovo)
			if(TempoPassatoDaUltimoControllo > 300000) IniziaControlloConnessione();
		}
	}

	if(TimerPing != null) clearTimeout(TimerPing);
	TimerPing = setTimeout(IniziaControlloConnessione, TempoDaAspettareMs);
}

function IniziaControlloConnessione()
{
	if(ControlloConnessioneInCorso == false)
	{
		ControlloConnessioneInCorso = true;
		EseguiPing(0);
	}
}

async function ConcludiControlloConnessione(PortaleRinnovoFunziona, ConnessioneFunziona)
{
	UltimoControllo = (new Date()).getTime();
	ConnessioneFunzionavaAllUltimoControllo = ConnessioneFunziona;
	
	if(ConnessioneFunziona == false && PortaleRinnovoFunziona == false)
		{ RegistraEvento('⛔ Connessione interrotta e rinnovo impossibile!', 'Sei disconnesso da internet, o il portale per il rinnovo non funziona. Non sono in grado di rinnovare l\'accesso...', true); }
	else if(ConnessioneFunziona == true && PortaleRinnovoFunziona == false)
		{ RegistraEvento('🆗 Connessione funzionante', '(ma il portale per il rinnovo non funziona, o non ti trovi a Praticelli!)', false); }
	else if(ConnessioneFunziona == false && PortaleRinnovoFunziona == true)
	{
		RegistraEvento('⏰ Connessione interrotta! Rinnovo in corso...', 'L\'accesso è scaduto e sto tentando di rinnovarlo...', true);
		var EsitoRinnovo;
		while (true)
		{
			EsitoRinnovo = await RinnovaLogin();

			if(EsitoRinnovo == 'OK')
			{
				RegistraEvento('✅ Accesso rinnovato! Connessione ripristinata', '', true);
				break;
			}
			else if(EsitoRinnovo != 'OK' && ConnessioneFunzionavaAllUltimoControllo == false)
			{
				RegistraEvento('❌ Il tentativo di accesso automatico è fallito! Riprovo...', '[passaggio non riuscito: ' + EsitoRinnovo + ']', true);
				await sleep(5000);
			}
			else if(EsitoRinnovo != 'OK' && ConnessioneFunzionavaAllUltimoControllo == true)
			{
				RegistraEvento('🆗 Connessione ripristinata!', '', true);
				break;
			}
		}
	}
	else if(ConnessioneFunziona == true && PortaleRinnovoFunziona == true)
	{
		RegistraEvento('🆗 Connessione funzionante', '', false);
	}
	ControlloConnessioneInCorso = false;
}

function EseguiPing(IndiceDaTestare)
{
	ping.sys.probe(DominiTestati[IndiceDaTestare], (isAlive) =>
		{
			DominiEsito[IndiceDaTestare] = isAlive;
			DecidiSeProseguirePing(IndiceDaTestare);
		}, { timeout: 2 } );
}

function DecidiSeProseguirePing(UltimoTestEseguito)
{
	if(UltimoTestEseguito == 0) EseguiPing(1);
	else if (UltimoTestEseguito < DominiTestati.length - 1)
	{
		if (DominiEsito[UltimoTestEseguito]) ConcludiControlloConnessione(DominiEsito[0], true);
		else EseguiPing(UltimoTestEseguito + 1);
	}
	else
	{
		if (DominiEsito[UltimoTestEseguito]) ConcludiControlloConnessione(DominiEsito[0], true);
		else ConcludiControlloConnessione(DominiEsito[0], false);
	}
}

async function RinnovaLogin()
{
	if(!config.has('username') || !config.has('password')) return 'credenziali non presenti in memoria';
	
	// Avvio chromium
	var browser, page;
	
	try {
		browser = await puppeteer.launch
			({
				headless: true,
				args: [
					'--disable-dev-shm-usage',
					'--fast-start',
					'--no-sandbox'
				]
			});
		page = (await browser.pages())[0];
	} catch(e) { browser.close(); return 'apertura browser/pagina: ' + e.message; }

	// Carico una pagina qualunque
	const TimestampInizio = (new Date()).getTime();
	try {
		await page.goto('http://www.google.com', { timeout: 15000, waitUntil: "networkidle0" });
	} catch(e) { browser.close(); return 'caricamento google: ' + e.message; }

	// Attendo redirect al portale di login
	const UrlLogin = 'http://131.114.101.102/login.php';
	while(true)
	{
		if(page.url() == UrlLogin) break;
		sleep(500);

		const adesso = (new Date()).getTime();
		if(adesso - TimestampInizio > 15000) { browser.close(); return 'redirect da google al portale fallito'; }
	}

	// Inserisco nome utente
	try
	{
		await page.$("#frmValidator > div > div > div:nth-child(1) > input"); //oppure: input[type="text"]
		await page.type('#frmValidator > div > div > div:nth-child(1) > input', config.get('username'));
	} catch(e) { browser.close(); return 'inserimento username: ' + e.message; }

	// Inserisco password
	try
	{
		await page.$("#frmValidator > div > div > div:nth-child(3) > input"); //oppure: input[type="password"]
		await page.type('#frmValidator > div > div > div:nth-child(3) > input', config.get('password'));
	} catch(e) { browser.close(); return 'inserimento password: ' + e.message; }

	const TimestampClick = (new Date()).getTime();
	try
	{
		await page.$("#frmValidator > div > div > button"); //oppure: button[type="submit"]
		await page.click('#frmValidator > div > div > button');
	} catch(e) { browser.close(); return 'click pulsante accedi: ' + e.message; }

	const TestoSuccesso = 'Buona navigazione. <br>Da questo momento potrai navigare liberamente.';
	while(true)
	{
		// Controllo se il login è riuscito
		var MessaggioSuccesso = '';
		const ElemSuccesso = await page.$("#timeval");
		if(ElemSuccesso != null)
		{
			try {
				MessaggioSuccesso = await (await ElemSuccesso.getProperty('innerHTML')).jsonValue();
			} catch(e) { browser.close(); return 'lettura messaggio successo: ' + e.message; }
		}

		if(page.url() == (UrlLogin + '?indexpage=session') || MessaggioSuccesso == TestoSuccesso)
		{
			try { await browser.close(); } catch(e) { return 'chiusura browser: ' + e.message; }
			config.set('UltimoRinnovo', (new Date()).getTime() );
			return 'OK';
		}
		
		// Controllo se il login è fallito
		var MessaggioErrore;
		const ElemErrore = await page.$("#message");
		if(ElemErrore != null)
		{
			try
			{
				MessaggioErrore = await (await ElemErrore.getProperty('innerHTML')).jsonValue();
				if(MessaggioErrore != '' && MessaggioErrore != '&nbsp' && MessaggioErrore != '&nbsp;')
				{
					MessaggioErrore = MessaggioErrore.replace('<div class="alert alert-danger" role="alert">', '');
					MessaggioErrore = MessaggioErrore.replace('</div>', '');
					browser.close();
					return 'login fallito: ' + MessaggioErrore;
				}
			} catch(e) { browser.close(); return 'lettura messaggio errore: ' + e.message; }
		}
		
		await sleep(500);

		const TimestampAttuale = (new Date()).getTime();
		if( (TimestampAttuale - TimestampClick) > 10000) { browser.close(); return 'nessun esito di login dopo 10 secondi'; }
	}
}

function sleep(ms)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}

function RegistraEvento(testo, dettagli, InviaNotifica)
{
	const adesso = new Date();
	const DataOra = '<span style="opacity: 0.7; font-size: 80%">' + FormattaTimestampComeData(adesso.getTime() ) + '</span> ';
	const TestoHTML = DataOra + testo + (dettagli == '' ? '' : ' <span style="font-size: 80%; opacity: 0.9;">' + dettagli + '</span>');

	if(FinestraUI != null && !FinestraUI.isDestroyed() && FinestraUI.isVisible() )
	    { FinestraUI.webContents.send('log', TestoHTML); }

	var NuovoLog;
	const LogPrecedente = config.get('log');
	if(LogPrecedente != null) NuovoLog = TestoHTML + '<br/>' + LogPrecedente;
	else NuovoLog = TestoHTML;
	config.set('log', NuovoLog);

	if(InviaNotifica)
	{
		new Notification({ title: testo, body: dettagli, icon: path.join(__dirname, 'img', 'icon.png') }).show();
	}
}

function FormattaTimestampComeData(timestamp)
{
	const NomeMese = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
	var data = new Date(timestamp);
	return data.getDate() + ' ' + NomeMese[data.getMonth()] + ' ' +
		data.getHours() + (data.getMinutes() < 10 ? ':0' : ':') + data.getMinutes() +
		(data.getSeconds() < 10 ? ':0' : ':') + data.getSeconds()
}