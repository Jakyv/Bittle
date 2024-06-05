// const cacheName='bittlepwa1';

// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('sw.js');
// }

// if(location.protocol=="http:"){
//     location.href="https"+location.href.substring(4);
// }

// let xhr=new XMLHttpRequest();
// xhr.onload=function(){
//     let v=xhr.responseText.trim()
//     if(!localStorage.pwaversion){
//         localStorage.pwaversion=v
//     }else if(localStorage.pwaversion!=v){
//         console.log("Updating PWA")
//         delete(localStorage.pwaversion)
//         caches.delete(cacheName).then(_=>{location.reload()})
//     }
// }
// xhr.onerror=function(){
//     console.log("Update check failed")
// }
// xhr.open("GET","pwaversion.txt?t="+Date.now())
// xhr.send();

//Decommenta per funzionamento offline (non funziona con server locale)

let lang, diff

let rows
let cells
let row
let cell
let parola                                      //parola da indovinare, per convenzione ora globale (poi va passata per parametro)
let vet
let lettere = "", occorrenze = [1,1,1,1,1]      //lettere e relative occorrenze della parola da indovinare

let indovinate = [false, false, false, false, false]
let nIndovinate = 0
let suggerite = ['', '', '', '', '']

let server

let aumentaStreak

function Server(indirizzo)
{
    this.indirizzo = indirizzo
    this.online = false
}

Server.prototype =
{
    constructor: Server,

    isOnline: async function()  //chiamare con await
    {
        try
        {
            const response = await fetch(this.indirizzo + '/verificaConnessione')
            this.online = true
            return true
        }
        catch (error)
        {
            this.online = false
            return false
        }
    },
//----------------------------------------
    notify: function()
    {
        try
        {
            fetch(this.indirizzo + '/verificaConnessione')
        }
        catch(error)
        {
            cambiaStato()
            console.log('errore')
        }
    },
//----------------------------------------
    ottieniParola: async function(lingua, difficoltà)      //chiamare con await
    {
        try
        {
            const response = await fetch(this.indirizzo + '/dizionario/' + lingua + '/ottieniParola/' + difficoltà,
                {
                    method: 'GET',
                }
            );

            if (!response.ok)
                throw new Error('Errore durante la richiesta.')

            const data = await response.text()
            return data
        }
        catch (error)
        {
            cambiaStato()
            console.log('errore')
        }
    },
//----------------------------------------
    cercaParola: async function(lingua, guess)  //chiamare con await
    {
        let esito

        try
        {
            const response = await fetch(this.indirizzo + '/dizionario/' + lingua + '/cercaParola/' + guess,
                {
                    method: 'GET',
                }
            );

            if (!response.ok)
                throw new Error('Errore durante la richiesta.')

            const data = await response.text()
            if (data === 'True')
                esito = true
            else
                esito = false
        }
        catch (error)
        {
            cambiaStato()
            console.log('Errore durante la richiesta:', error)
        }

        return esito
    }

}

async function init()
{
    let online

    if (localStorage.streak == undefined)   //gestisco il caso del primo accesso
    {
        localStorage.streak = '0'
        document.getElementById('popup-istruzioni').style.display = 'block'
    }

    if (localStorage.maxStreak == undefined)
        localStorage.maxStreak = '0'

    document.getElementsByClassName('streak')[0].innerHTML = localStorage.streak
    document.getElementById('maxStreak').innerHTML = localStorage.maxStreak

    aumentaStreak = true
    server = new Server('https://jakyv.pythonanywhere.com')
    online = await server.isOnline()

    if (online)
    {
        document.getElementById("checkbox").checked = true
        document.getElementById("lblConnetti").innerHTML = 'Connesso'
    }
    else
    {
        document.getElementById("checkbox").checked = false
        document.getElementById("lblConnetti").innerHTML = 'Connessione assente'
    }
}

function reset()
{
    clearTab()
    initTab()
    clearTastiera()

    indovinate = [false, false, false, false, false]
    nIndovinate = 0
    suggerite = ['', '', '', '', '']
    lettere = ''

    mostra('tabella')
    mostra('tastiera')
    document.getElementById('popup-risultato').style.display = 'none'
    //togli('popup')
}

//--- GESTIONE DELLO STILE PER LA SELEZIONE DI LINGUA E DIFFICOLTA
let opzioni =
{
    lingua:
    {
        id: 'lingua',
        scelte: ['Italiano', 'Inglese'],
        val:    ['it', 'en'],
        index: 0
    },

    difficoltà:
    {
        id: 'difficoltà',
        scelte: ['Facile', 'Difficile', 'Impossibile'],
        index: 0
    }
}
/*
let istruzioniUtili =
{
    generale:
    {
        titolo: 'Istruzioni generali',
        descrizione: ['Indovina la parola nascosta di 5 lettere, entro un massimo di 5 tentativi.',
                      'Ogni parola, per essere convalidata, DEVE esistere'],

        descrizioneComune: ['Ogni lettera CORRETTA viene colorata di VERDE',
                            'Ogni lettera SBAGLIATA viene colorata di ROSSO',
                            'Ogni lettera corretta ma nella POSIZIONE SBAGLIATA viene colorata di GIALLO']
    },

    gestioneStreak:
    {
        titolo: 'Gestione della streak di vittorie',
        descrizione: ['La streak aumenta ad ogni partita vinta e si azzera ad ogni sconfitta',
                      'Se la partita viene giocata offline o se si verifica una disconnessione temporanea, la streak non aumenta, ma può comunque azzerarsi in caso di sconfitta']
    },

    facile:
    {
        titolo: 'Facile',
        descrizione: 'Dopo ogni tentativo viene suggerita una lettera, fino ad un totale di 3 (indovinate comprese)'
    },

    difficile:
    {
        titolo: 'Difficile',
        descrizioneVeloce: ['Simile alla modalità facile, ma il vocabolario dal quale vengono estratte le parole da indivinare è più ampio e complesso'],
        descrizioneTotale: 'Vocabolario più ampio e parole complesse'
    },

    impossibile:
    {
        titolo: 'Impossibile',
        descrizione: ['Al contrario delle altre difficoltà, non vengono confrontate le singole lettere, ma i binari dei codici ASCII di ciascuna',
                      "Nella cella verrà inserito il decimale ottenuto dall'operazione AND tra i 2 binari"]

    }
}
*/
function trovaOpzione(id)
{
    if (id == 'lingua')
        return opzioni.lingua
    else
    if (id == 'difficoltà')
        return opzioni.difficoltà
}

function next(id)
{
    opzione = trovaOpzione(id)
    if (opzione.index != opzione.scelte.length-1)
        opzione.index++
    else
        opzione.index = 0

    document.getElementById(id).value = opzione.scelte[opzione.index]
}

function prec(id)
{
    opzione = trovaOpzione(id)
    if (opzione.index != 0)
        opzione.index--
    else
        opzione.index = opzione.scelte.length-1

    document.getElementById(id).value = opzione.scelte[opzione.index % opzione.scelte.length]
}

async function cambiaStato()
{
    let statoCorrente = server.online
    if (statoCorrente == true)              //se da acceso viene spento
    {
        document.getElementById("checkbox").checked = false
        document.getElementById("lblConnetti").innerHTML = 'Connetti al server'
        server.online = false
    }
    else                                    //se da spento viene acceso
    {
        document.getElementById("checkbox").checked = true
        document.getElementById("loading").style.visibility = 'visible'
        statoCorrente = await server.isOnline()
        document.getElementById("loading").style.visibility = 'hidden'
        if (statoCorrente == false)         //se prova a connettersi ma non riesce, stampa connessione assente e toglie il check
        {
            document.getElementById("checkbox").checked = false
            document.getElementById("lblConnetti").innerHTML = 'Connessione assente'
        }
        else
            document.getElementById("lblConnetti").innerHTML = 'Connesso'
    }
}

function modificaVolume(img, audio)
{
    console.log(audio.volume)

    if (audio.volume)
    {
        audio.volume = 0
        img.src = 'src/img/volumeOff.png'
    }
    else
    {
        audio.volume = 1
        img.src = 'src/img/volumeOn.png'
    }
}

function avvertiUtente()
{
    document.removeEventListener("keydown", tastoPremuto);
    document.getElementById('popup-allerta').style.display = 'block'
}

function collectData()
{
    lang = opzioni.lingua.val[opzioni.lingua.index]
    diff = opzioni.difficoltà.index
}

async function play()
{
    //avvia musica
    document.getElementById('background-audio').play();

    //salva le impostazioni e inizia il gioco
    collectData();
    toSlide("game");
    initTab();          //inizializza la tabella

//scelgo la parola e il dizionario in base alla lingua (e difficoltà, ancora da fare), per comodità ora sono vettori contenuti in "dizionario.js"
//poi tutte le parole dovranno essere contenute in un file, oppure, se riuscite a trovarne gratuite, sarebbe meglio usare API apposite.
    if (server.online)
    {
        document.getElementById("loading").style.visibility = 'visible'
        try
        {
            parola = await server.ottieniParola(lang, diff)
            aumentaStreak = true
            console.log(parola)
        }
        catch(error)
        {
            cambiaStato()
        }
        document.getElementById("loading").style.visibility = 'hidden'
    }
    if (!server.online)
    {
        if (lang == 'it')
        {
            if (diff == 0)
                vet = itFacili
            else
                vet = itMedie
        }
        else
        if (lang == 'en')
        {
            if (diff == 0)
                vet = enFacili
            else
                vet = enMedie
        }

        parola = vet[Math.floor(Math.random() * vet.length)]
    }

//converte per sicurezza in minuscolo e calcola le occorrenze per ogni lettera (servirà poi per gestire quali celle colorare di verde o giallo, e quante)
    lettere = ''
    occorrenze = [1, 1, 1, 1, 1]

    parola = parola.toLowerCase()
    for (var k=0; k<5; k++)
    {
        console.log(occorrenze)
        lettera = parola[k]

        if (!lettere.includes(lettera))
        {
            lettere += lettera
        }
        else
        {
            occorrenze[lettere.indexOf(lettera)]++
        }
    }
//nuovo evento, quando premo un tasto viene chiamata la funzione tastoPremuto
    document.addEventListener("keydown", tastoPremuto);
}

function simulaPressione(tasto)
{
    var evento = new KeyboardEvent('keydown', {'key': tasto});      //quando l'utente usa la tastiera a schermo, simulo la pressione del tasto cliccato da tastiera, in quanto già gestito nella funzione successiva
    document.dispatchEvent(evento);
}

async function tastoPremuto(event)
{
    if ((event.key >= 'A' && event.key <= 'Z' || event.key >= 'a' && event.key <= 'z') && event.key.length == 1) //se il tasto premuto è una lettera
    {
        //se il contatore cell (per le celle di una riga) è < 5 scrivo dentro alla cella la lettera e aumento il contatore
        if (cell < 5)
        {
            cells[cell].innerHTML = event.key.toLowerCase()

            if (diff == 0)
            {
                if (suggerite[cell] == '')
                    cells[cell].style.background = 'rgba(255, 255, 255, 0.15)'
                else
                {
                    if (event.key.toLowerCase() == suggerite[cell])
                        cells[cell].style.background = 'rgba(30, 165, 6, 0.5)'
                    else
                        cells[cell].style.background = 'rgba(163, 20, 20, 0.5)'
                }
            }

            cell++
        }
    }
    else if (event.key == 'Backspace')                   //se il tasto premuto è backspace
    {
        if (cell != 0)                              //se la riga non è vuota decremento il contatore e cancello l'ultima lettara
        {
            cell--;
            cells[cell].innerHTML = ""

            if (diff == 0)
            {
                if (suggerite[cell] != '')
                {
                    cells[cell].innerHTML = suggerite[cell]
                    cells[cell].style.background = 'rgba(0, 255, 255, 0.3)'     //cyan
                }
            }
        }
    }
    else if (event.key == 'Enter')                   //se il tasto premuto è enter (invio)
    {
        document.removeEventListener("keydown", tastoPremuto)  //rimuovo temporaneamente il listener per evitare eventuali bug
        if (cell == 5)                              //se la riga è completata (ho inserito 5 lettere) verifico che sia corretta, se errata cambio riga
        {
            let risultato = await controllaRiga()

            if(!risultato)                          //se ho sbagliato la parola, ma esiste
            {
                document.addEventListener("keydown", tastoPremuto)     //riaggiungo il listener

                if (row != 4)                       //se ho ancora tentativi
                {
                    row++
                    cells = rows[row].getElementsByClassName("cella")
                    cell = 0

//---- GESTIONE DELLA MODALITA FACILE -- ogni turno, se la parola non viene indovinata, sulla riga successiva apparirà una lettera in più nella posizione corretta, fino ad un massimo di 3

                    if (diff == 0)
                    {
                        for (let i = 0; i < 5; i++)
                        {
                            if (suggerite[i] != '')
                            {
                                cells[i].innerHTML = suggerite[i]
                                cells[i].style.background = 'rgba(0, 255, 255, 0.3)'    //cyan
                            }
                        }

                        if (nIndovinate < 3)
                        {
                            let casuale
                            do
                            {
                                casuale = Math.floor(Math.random() * 4)
                            }
                            while (indovinate[casuale] == true || suggerite[casuale] != '')
                            cells[casuale].innerHTML = parola[casuale]
                            cells[casuale].style.background = 'rgba(0, 255, 255, 0.3)'  //cyan
                            suggerite[casuale] = parola[casuale]
                            nIndovinate++
                        }
                    }
//----
                }
                else                                //se ho sbagliato parola e finito i tentativi, ho perso
                {
                    haiPerso()
                }
            }
            else if (risultato == 1)                //se la parola è corretta, quindi tutte le lettere inserite corrispondono, ho vinto
            {
                    haiVinto()
            }
            else if (risultato == -1)
                document.addEventListener("keydown", tastoPremuto)     //riaggiungo il listener
        }
        else
            document.addEventListener("keydown", tastoPremuto)     //riaggiungo il listener
    }
}

function haiVinto()
{
    let record = false
    let offline = false
    let differenza
    let campo1, campo2

    campo1 = document.querySelectorAll('#popup-risultato div.campo span')[0]
    campo2 = document.querySelectorAll('#popup-risultato div.campo span')[1]

    nascondi('tabella')
    nascondi('tastiera')

    if (aumentaStreak)                              //se il round è stato giocato online aumento la streak
    {
        let streak = parseInt(localStorage.streak)
        streak += 1
        localStorage.streak = streak.toString()

        differenza = streak - parseInt(localStorage.maxStreak)

        if (differenza > 0)
        {
            localStorage.maxStreak = streak.toString()
            record = true
        }
    }
    else
        offline = true

    document.getElementById('popup-risultato').style.display = 'block'

    let esito = document.getElementById('esito')
    esito.innerHTML = 'HAI VINTO!'
    esito.style.color = 'green'

    campo1.innerHTML = localStorage.streak

    if (!offline)
    {
        if (record)
            campo2.innerHTML = 'Punteggio record'

        else if (differenza == 0)
            campo2.innerHTML = 'Record eguagliato'

        else if (differenza == -1)
            campo2.innerHTML = 'Un passo dal record'

        else
        {
            campo2.innerHTML = 'Ne mancano ' + (parseInt(localStorage.maxStreak) - parseInt(localStorage.streak)) + ' al record'
        }
    }
    else
        document.querySelectorAll('#popup-risultato div.campo span')[1].innerHTML = 'La streak non aumenta offline'
}

function haiPerso()
{
    nascondi('tabella')
    nascondi('tastiera')

    localStorage.streak = '0'

    document.getElementById('popup-risultato').style.display = 'block'

    let esito = document.getElementById('esito')
    console.log(esito.innerHTML)
    esito.innerHTML = 'HAI PERSO'
    esito.style.color = 'darkred'

    document.querySelectorAll('#popup-risultato div.campo span')[0].innerHTML = localStorage.streak
    document.querySelectorAll('#popup-risultato div.campo span')[1].innerHTML = 'La parola era: ' + parola.toUpperCase();
    //document.getElementsByClassName('streak')[2].innerHTML = 'La parola era: ' + parola.toUpperCase();
}

function tornaHome()
{
    document.getElementById('background-audio').pause();
    document.getElementById('background-audio').currentTime = 0;
    reset()
    toSlide('settings')

    document.getElementsByClassName('streak')[0].innerHTML = localStorage.streak
    document.getElementById('maxStreak').innerHTML = localStorage.maxStreak         //metterlo anche in tornaHome
}

function giocaAncora()
{
    reset()
    play()
}

function nascondi(id)
{
    document.getElementById(id).style.visibility = 'hidden'
}

function mostra(id)
{
    document.getElementById(id).style.visibility = 'visible'
}

function togli(id)
{
    document.getElementById(id).style.background = 'black'
}

function togli(id)
{
    document.getElementById(id).style.display = 'block'
}

function toSlide(id)            //cambia slide, nasconde tutte le slide e attiva solo quella passata per parametro
{
    document.querySelectorAll("div.slide").forEach(function(e)
    {
        e.classList.add("hidden")
        e.classList.remove("visible")
    })

    let d = document.getElementById(id)
	d.classList.add("visible")
	d.classList.remove("hidden")
	d.querySelectorAll("*").forEach(function(e2)
	{
		e2.tabIndex=""
	})
}

function initTab()              //inizializza la tabella
{
    rows = document.getElementsByClassName("row")
    cells = rows[0].getElementsByClassName("cella")
    row = 0
    cell = 0
}

function clearTab()
{
    initTab()
    for (row = 0; row < 5; row++)
    {
        cells = rows[row].getElementsByClassName("cella")
        for (cell = 0; cell < 5; cell++)
        {
            cells[cell].innerHTML = ''
            cells[cell].style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
        }
    }
}

function clearTastiera()
{
    let tasti = document.getElementsByClassName('lettera')
    for (var tasto of tasti)
        tasto.style.background = "rgba(255, 255, 255, 0.15)"
}

async function controllaRiga()      //da migliorare, controlla se una parola inserita è corretta o meno, colora le caselle di rosso verde o giallo se le lettere sono:
{                                   //errate, nella posizione giusta, nella posizione sbagliata
    let haiVinto = 1
    let guess = ""
    let occorrenzeTemp = occorrenze.slice()                     //copia il vettore delle lettere della parola corretta e delle occorrenze in un vettore temporaneo
    let lettereTemp = lettere.slice()
    let corrette = [false, false, false, false, false]
    let tastoVirtuale

    for (var k=0; k<5; k++)
        guess += cells[k].innerHTML                             //costruisco la parola dalle lettere nelle celle (serve solo per controllare se presente nel dizionario)

    //guess = guess.toLowerCase()

    if (server.online)
    {
        try
        {
            console.log(guess)
            let esito = await server.cercaParola(lang, guess)
            console.log(esito)

            if (!esito)                                         //se la parola non è presente nel dizionario, ritorna -1
                return -1
        }
        catch
        {
            console.log('impossibile accedere al server')
            aumentaStreak = false                               //la streak aumenta solo online
            cambiaStato()
        }
    }
    else
        aumentaStreak = false
//----- GESTIONE DELLA MODALITA IMPOSSIBILE
    if (diff == 2)
    {
        for (let i = 0; i < 5; i++)
        {
            let risultato = guess.charCodeAt(i) & parola.charCodeAt(i)
            let nuovoDiv = document.createElement('div')
            nuovoDiv.innerHTML = risultato
            nuovoDiv.style.fontSize = '0.75rem'
            nuovoDiv.style.position = 'absolute'
            nuovoDiv.style.right = '3px'
            nuovoDiv.style.bottom = '2px'

            cells[i].appendChild(nuovoDiv)
        }
        if (guess == parola)
            return 1
        else
            return 0
    }

    for (let i=0; i<5; i++)                                     //trova le lettere nella posizione giusta (hanno priorità nel decrementare l'occorrenza)
    {
        tastoVirtuale = document.querySelector('#tastiera .lettera[value="' + cells[i].innerHTML.toUpperCase() + '"]')
        if (cells[i].innerHTML == parola[i])
        {
//----- GESTIONE DELLA MODALITA FACILE
            if (indovinate[i] == false && suggerite[i] == '')               //se è la prima volta che la trovo e non è nemmeno stata suggerita
            {
                indovinate[i] = true
                nIndovinate++
            }
//-----
            cells[i].style.background = "rgba(30, 165, 6, 0.5)"                           //background verde
            tastoVirtuale.style.background = "rgba(30, 165, 6, 0.8)"
            occorrenzeTemp[lettereTemp.indexOf(cells[i].innerHTML)]--       //decremento occorrenza lettera
            corrette[i] = true
        }
    }

    /*
     * tutto questo perchè non basta semplicemente colorare di verde o giallo la caselle in base alla posizione corretta o errata delle lettere,
     * ma bisogna anche tener conto
    */
    for (i=0; i < 5; i++)       //colora le altre e verifica se corretta
    {
        tastoVirtuale = document.querySelector('#tastiera .lettera[value="' + cells[i].innerHTML.toUpperCase() + '"]')     //trova la lettera sulla tastiera (serve per colorarla in seguito)

        if (!corrette[i])
        {
            haiVinto = 0
            if (parola.includes(cells[i].innerHTML) && occorrenzeTemp[lettereTemp.indexOf(cells[i].innerHTML)] > 0)
            {
                cells[i].style.background = "#a79518"                       //background giallo
                if (tastoVirtuale.style.background != "rgba(30, 165, 6, 0.8)")
                    tastoVirtuale.style.background = "#a79518"
                occorrenzeTemp[lettereTemp.indexOf(cells[i].innerHTML)]--   //decremento occorrenza lettera
            }
            else
            {
                cells[i].style.background = "rgba(163, 20, 20, 0.5)"
                if (tastoVirtuale.style.background != "rgba(30, 165, 6, 0.8)" && tastoVirtuale.style.background != "#a79518")
                    tastoVirtuale.style.background = "rgba(163, 20, 20, 0.8)"           //coloro di rosso il tasto
            }
        }
    }

    return haiVinto
}
