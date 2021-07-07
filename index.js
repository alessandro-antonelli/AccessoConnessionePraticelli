const process = require('process');
const ipcRenderer = require('electron').ipcRenderer;
const StoreProvider = require('electron-store');
var config;
var DataUltimoRinnovo = '?';

window.addEventListener('DOMContentLoaded', () =>
{
	AggiornaDataRinnovo(DataUltimoRinnovo);
	ipcRenderer.on('versione', (event, arg) => { document.getElementById('versione').innerHTML = arg; });
	ipcRenderer.on('log', (event, arg) => { AggiungiLog(arg); });
	ipcRenderer.on('DataRinnovo', (event, arg) => { AggiornaDataRinnovo(arg); });

	ipcRenderer.on('CifraturaConfig', (event, arg) =>
	{
		config = new StoreProvider({name: 'config', clearInvalidConfig: true, encryptionKey: arg });
		CaricaConfigurazione();
	});

	document.getElementById('header').addEventListener('click', ToggleHeader);
	document.getElementById('quit').addEventListener('click', function() { ipcRenderer.send('quit'); } );
	document.getElementById('usr').addEventListener('keyup', function(event)
	{
		if(event.key == 'Enter')
			{ document.getElementById('psw').focus(); document.getElementById('psw').select(); }
	} );
	document.getElementById('psw').addEventListener('keyup', function(event) { if(event.key == 'Enter') SalvaCredenziali(); } );
})

function CaricaConfigurazione()
{
	if(config.has('username') && config.has('password'))
	{
		document.getElementById('usrLab').innerHTML = config.get('username');
		document.getElementById('usr').value = config.get('username');
		document.getElementById('psw').value = config.get('password');

		document.getElementById('sloggato').style.display = 'none';
		document.getElementById('loggato').style.display = 'block';
		document.getElementById('credenziali').style.display = 'none';
		document.getElementById('OnOffLab').style.display = 'block';
		document.getElementById('rinnovo').style.display = 'block';
		document.getElementById('LogContainer').style.display = 'block';
		if(config.has('attivo')) ToggleAttivazione(config.get('attivo'));

		if (process.platform === 'linux') document.getElementById('StartupLab').style.display = 'none';
		else {	
			document.getElementById('StartupLab').style.display = 'block';
			if(config.has('AutoStartup')) document.getElementById('Startup').checked = config.get('AutoStartup');
		}
	}
	else
	{
		ToggleHeader();

		document.getElementById('sloggato').style.display = 'block';
		document.getElementById('loggato').style.display = 'none';
		document.getElementById('credenziali').style.display = 'block';
		document.getElementById('OnOffLab').style.display = 'none';
		document.getElementById('StartupLab').style.display = 'none';
		document.getElementById('rinnovo').style.display = 'none';
		document.getElementById('LogContainer').style.display = 'none';
		document.getElementById('usr').focus();
	}

	if(config.has('log') && document.getElementById('log').innerHTML == '') document.getElementById('log').innerHTML = config.get('log');

	document.getElementById('OnOff').addEventListener('change', ToggleAttivazione.bind(null, null));
	document.getElementById('Startup').addEventListener('change', ToggleStartup);
	document.getElementById('salva').addEventListener('click', SalvaCredenziali);
	document.getElementById('modifica').addEventListener('click', ModificaCredenziali);
}

function ModificaCredenziali()
{
	var pannello = document.getElementById('credenziali');
	if(pannello.style.display == 'none')
	{
		pannello.style.display = 'block';
		document.getElementById('usr').select();
		document.getElementById('usr').focus();
	}
	else pannello.style.display = 'none';
}

async function SalvaCredenziali()
{
	const usr = document.getElementById('usr').value;
	const psw = document.getElementById('psw').value;
	if(usr != '' && psw != '')
	{
		config.set('username', usr);
		config.set('password', psw);

		document.getElementById('usrLab').innerHTML = usr;

		document.getElementById('sloggato').style.display = 'none';
		document.getElementById('loggato').style.display = 'block';
		document.getElementById('credenziali').style.display = 'none';
		document.getElementById('OnOffLab').style.display = 'block';
		document.getElementById('rinnovo').style.display = 'block';
		document.getElementById('LogContainer').style.display = 'block';
		if(config.has('attivo')) { document.getElementById('OnOff').checked = config.get('attivo'); ToggleAttivazione(false); }

		if (process.platform === 'linux') document.getElementById('StartupLab').style.display = 'none';
		else {
			document.getElementById('StartupLab').style.display = 'block';
			if(config.has('AutoStartup')) document.getElementById('Startup').checked = config.get('AutoStartup');
		}
	} else
	{
		document.getElementById('errori').innerHTML = '⚠️ Devi inserire un nome utente e una password!';
		document.getElementById('errori').scrollIntoView();
		setInterval(() => { document.getElementById('errori').innerHTML = ''; }, 5000);
		if(usr == '') document.getElementById('usr').focus();
		else document.getElementById('psw').focus();
	}
}

function ToggleAttivazione(ValoreDaImpostare)
{
	const attivo = (ValoreDaImpostare != null ? ValoreDaImpostare : document.getElementById('OnOff').checked);
	document.getElementById('OnOff').checked = attivo;
	config.set('attivo', attivo);

	if(attivo)
	{
		//comunica al main per attivare il ciclo
		if(ValoreDaImpostare == null) ipcRenderer.send('attivato');

		document.getElementById('OnOffLab').style.fontWeight = 'bold';
		document.getElementById('OnOffLab').style.color = 'red';
	} else
	{
		if(ValoreDaImpostare == null) ipcRenderer.send('disattivato');

		document.getElementById('OnOffLab').style.fontWeight = 'normal';
		document.getElementById('OnOffLab').style.color = 'black';
	}
}

function ToggleStartup()
{
	if(document.getElementById('Startup').checked)
	{
		config.set('AutoStartup', true);
		ipcRenderer.send('AttivaStartup');
	} else
	{
		config.set('AutoStartup', false);
		ipcRenderer.send('DisattivaStartup');
	}
}

function AggiungiLog(testo)
{
	var logbox = document.getElementById('log');
	if(logbox != null) logbox.insertAdjacentHTML('afterbegin', testo + '<br/>');
}

function AggiornaDataRinnovo(testo)
{
	document.getElementById('DataRinnovo').innerHTML = testo;
	DataUltimoRinnovo = testo;
}

function ToggleHeader()
{
	var TestoHeader = document.getElementById('msg-header');
	var header = document.getElementById('header');
	var ScrittaInfo = document.getElementById('ScrittaInfo');

	if(TestoHeader.style.display == 'inline')
	    { TestoHeader.style.display = 'none'; ScrittaInfo.style.display = 'inline'; header.style.cursor = 'pointer'; }
	else { TestoHeader.style.display = 'inline'; ScrittaInfo.style.display = 'none'; header.style.cursor = 'default'; }
}