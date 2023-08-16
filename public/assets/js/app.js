const fetchURL = '.';
const divResults = document.querySelector('#resultados')
const divJsonResponse = document.querySelector('#json-response')
const divBtnAction = document.querySelector('#btnAction')

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
  
    return response;
}

function initBtnAction(){
    divBtnAction.innerHTML = '<button id="btnVerNotasPorPeriodo" class="btn btn-primary" type="button">Ver Notas por Periodo</button>';
    document.querySelector('#btnVerNotasPorPeriodo').addEventListener('click', () => {
        verNotasPorPeriodo()
    })
}

function output(inp) {
    divJsonResponse.innerHTML = "";
    divJsonResponse.appendChild(document.createElement('pre')).innerHTML = inp;
    initBtnAction()
}

async function verNotasPorPeriodo() {
    try {
        let matriculaId = document.querySelector('#matriculaId').value.trim()
        let periodoId = document.querySelector('#periodoId').value.trim()
        let loader = '<div class="d-flex justify-content-center"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Cargando...</span></div></div>'
        let btnLoadingStatus = '<button class="btn btn-primary" type="button" disabled><span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status"> Obteniendo datos...</span></button>'
    
        divBtnAction.innerHTML = btnLoadingStatus
        divJsonResponse.innerHTML = loader

        const response = await fetchWithTimeout(fetchURL + '/notas/' + matriculaId + '/periodo/' + periodoId, {
            timeout: 20000
        });

        const data = await response.json();

        var str = JSON.stringify(data, null, 4);
        output(syntaxHighlight(str));

        console.log(str)

    } catch (error) {
        // Timeouts if the request takes longer than 20 seconds
        console.log(error);

        divJsonResponse.innerHTML = "";
        divJsonResponse.appendChild(document.createElement('pre')).innerHTML = "Se agotó el tiempo de espera de respuesta, verifique los parámetros de la consulta."
        initBtnAction()
    }
  }

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

const btnSetDefaultValues = document.querySelector('#btnSetDefaultValues').addEventListener('click', () => {
    document.querySelector('#matriculaId').value = 12267
    document.querySelector('#periodoId').value = 66
})

const btnSubmit = document.querySelector('#btnVerNotasPorPeriodo').addEventListener('click', () => {
    verNotasPorPeriodo()
})
