const StoreProvider = require('electron-store');
const config = new StoreProvider({name: 'config', encryptionKey: '9YiBu5#lHygy' });
const ipcRenderer = require('electron').ipcRenderer;

window.addEventListener('DOMContentLoaded', () =>
{
	document.getElementById('OnOff').addEventListener('change', ToggleAttivazione);
	document.getElementById('salva').addEventListener('click', SalvaCredenziali);
	document.getElementById('modifica').addEventListener('click', ModificaCredenziali);

	ipcRenderer.on('log', (event, arg) => { AggiungiLog(arg); });
	
	if(config.has('username') && config.has('password'))
	{
		document.getElementById('usrLab').innerHTML = config.get('username');
		document.getElementById('usr').value = config.get('username');
		document.getElementById('psw').value = config.get('password');

		document.getElementById('sloggato').style.display = 'none';
		document.getElementById('loggato').style.display = 'block';
		document.getElementById('credenziali').style.display = 'none';
		document.getElementById('OnOff').disabled = false;
		document.getElementById('OnOffLab').style.cursor = 'pointer';
		document.getElementById('OnOffLab').style.color = 'black';
		if(config.has('attivo')) document.getElementById('OnOff').checked = config.get('attivo');
	}
	else
	{
		document.getElementById('sloggato').style.display = 'block';
		document.getElementById('loggato').style.display = 'none';
		document.getElementById('credenziali').style.display = 'block';
		document.getElementById('OnOff').disabled = true;
		document.getElementById('OnOffLab').style.cursor = 'not-allowed';
		document.getElementById('OnOffLab').style.color = 'silver';
		document.getElementById('usr').focus();
	}
})

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
		document.getElementById('OnOff').disabled = false;
		document.getElementById('OnOffLab').style.cursor = 'pointer';
		document.getElementById('OnOffLab').style.color = 'black';
		if(config.has('attivo')) document.getElementById('OnOff').checked = config.get('attivo');
	} else
	{
		document.getElementById('errori').innerHTML = '⚠️ Devi inserire un nome utente e una password!';
		document.getElementById('errori').scrollIntoView();
		setInterval(() => { document.getElementById('errori').innerHTML = ''; }, 5000);
		if(usr == '') document.getElementById('usr').focus();
		else document.getElementById('psw').focus();
	}
}

function ToggleAttivazione()
{
	const attivo = document.getElementById('OnOff').checked;
	config.set('attivo', attivo);

	if(attivo)
	{
		//comunica al main per attivare il ciclo
		ipcRenderer.send('attivato');

		document.getElementById('OnOffLab').style.fontWeight = 'bold';
		document.getElementById('OnOffLab').style.color = 'red';
	} else
	{
		ipcRenderer.send('disattivato');

		document.getElementById('OnOffLab').style.fontWeight = 'normal';
		document.getElementById('OnOffLab').style.color = 'black';
	}
}

function AggiungiLog(testo)
{
	const adesso = new Date();
	const DataOra = '<span style="opacity: 0.7">' + adesso.getDate() + '/' + (adesso.getMonth()+1) + ' ' + adesso.getHours() + (adesso.getMinutes() < 10 ? '0:' : ':') + adesso.getMinutes() + (adesso.getSeconds() < 10 ? '0:' : ':') + adesso.getSeconds() + '</span> ';
	document.getElementById('log').innerHTML = DataOra + testo + '<br/>' + document.getElementById('log').innerHTML;
}