#codice sorgente del server
#caricato su pythonanywhere, sempre attivo
#non eseguire

from flask import Flask
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

def esiste(parola, lingua):
    if lingua == 'it':
        nomeFile = 'dizionario-it.txt'
    else:
        nomeFile = 'dizionario-en.txt'

    with open(nomeFile, 'r') as file:
        parole = [line.strip() for line in file]

    return parola in parole

def estraiCasuale(lingua, difficolta):
    if int(difficolta) > 1:
        difficolta = '1'
    nomeFile = lingua
    nomeFile += '-' + difficolta + '.txt'

    with open(nomeFile, 'r') as file:
        parole = [line.strip() for line in file]

    return parole[random.randint(0, len(parole)-1)]

@app.route('/', methods=['GET'])
def saluta():
    return 'Ciao mondo'

@app.route('/verificaConnessione', methods=['GET'])
def verificaConnessione():
    return 'Connessione riuscita'

@app.route('/dizionario/<lingua>/cercaParola/<parola>', methods=['GET'])
def cercaParola(lingua, parola):
    guess = parola
    lang = lingua
    esito = esiste(guess, lang)
    msg = str(esito);
    return msg

@app.route('/dizionario/<lingua>/ottieniParola/<difficolta>', methods=['GET'])
def ottieniParola(lingua, difficolta):
    return estraiCasuale(lingua, difficolta)

if __name__ == '__main__':
    app.run(debug=True)


